import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, SortAsc, SortDesc, X, User, Phone, Mail, 
  Calendar, MapPin, Building, DollarSign, Clock, Tag,
  ChevronRight, Eye, Edit, Star, TrendingUp, Activity,
  FileText, MessageSquare, CheckCircle, AlertTriangle, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisSupabase } from '../../config/analysisSupabase';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

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
}

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

// Sidebar con ficha completa del prospecto
const ProspectoSidebar: React.FC<SidebarProps> = ({ prospecto, isOpen, onClose, onNavigateToLiveChat, onNavigateToNatalia }) => {
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [llamadas, setLlamadas] = useState<LlamadaVenta[]>([]);

  // Verificar si hay conversación activa en live chat y cargar llamadas
  useEffect(() => {
    if (prospecto?.id) {
      checkActiveChat(prospecto.id);
      loadLlamadasProspecto(prospecto.id);
    }
  }, [prospecto]);

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
          feedback_resultado
        `)
        .eq('prospecto', prospectoId)
        .order('fecha_llamada', { ascending: false });

      if (error) {
        console.error('Error loading llamadas:', error);
        return;
      }

      setLlamadas(data || []);
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
      console.log('💬 Chat check for prospecto:', {
        prospectoId,
        whatsapp: prospecto?.whatsapp,
        id_uchat: prospecto?.id_uchat,
        hasActiveByProspectId,
        hasActiveByPhone,
        hasActiveByUchatId,
        finalResult: hasActiveConversation
      });
      
      setHasActiveChat(hasActiveConversation);
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
            className="fixed right-0 top-0 h-full w-3/5 bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                    <User className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {prospecto.ciudad_residencia} • {prospecto.interes_principal}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveChat && (
                    <button 
                      onClick={() => onNavigateToLiveChat?.(prospecto.id)}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors shadow-lg"
                      title="Ir a conversación activa"
                    >
                      <MessageSquare size={20} />
                    </button>
                  )}
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Estado y Prioridad */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                  className="flex items-center gap-4"
                >
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prospecto.etapa || '')}`}>
                    {prospecto.etapa || 'Sin etapa'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className={getScoreColor(prospecto.score || '')} size={16} />
                    <span className={`text-sm font-medium ${getScoreColor(prospecto.score || '').replace('bg-', 'text-').replace('-100', '-600').replace('-900/20', '-400')}`}>
                      {prospecto.score || 'Sin score'}
                    </span>
                  </div>
                  {prospecto.requiere_atencion_humana && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-orange-600 dark:text-orange-400" size={16} />
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        Requiere atención humana
                      </span>
                    </div>
                  )}
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
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Email</label>
                      <div className="text-gray-900 dark:text-white font-mono">{prospecto.email || 'No disponible'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">WhatsApp</label>
                      <div className="text-gray-900 dark:text-white font-mono">{prospecto.whatsapp || 'No disponible'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Teléfono</label>
                      <div className="text-gray-900 dark:text-white font-mono">{prospecto.telefono_principal || 'No disponible'}</div>
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
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ciudad</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.ciudad_residencia}</div>
                      </div>
                    )}
                    
                    {prospecto.cumpleanos && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cumpleaños</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.cumpleanos}</div>
                      </div>
                    )}
                    {prospecto.nombre_conyuge && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cónyuge</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.nombre_conyuge}</div>
                      </div>
                    )}
                    {prospecto.campana_origen && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Campaña</label>
                        <div className="text-gray-900 dark:text-white">{prospecto.campana_origen}</div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Información Comercial */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={18} />
                    Información Comercial
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Score</label>
                      <div className={`inline-block px-2 py-1 rounded text-sm font-medium ${getScoreColor(prospecto.score || '')}`}>
                        {prospecto.score || 'Sin score'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ingresos</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {prospecto.ingresos || 'No definido'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Interés Principal</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {prospecto.interes_principal || 'No definido'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Asesor Asignado</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {prospecto.asesor_asignado || 'No asignado'}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Información de Viaje (si aplica) */}
                {(prospecto.destino_preferencia || prospecto.tamano_grupo || prospecto.cantidad_menores || prospecto.viaja_con) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.45, ease: "easeOut" }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin size={18} />
                      Información de Viaje
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {prospecto.destino_preferencia && (
                        <div>
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
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Viaja Con</label>
                          <div className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2 rounded">
                            {prospecto.viaja_con}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Timeline */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={18} />
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Creado
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {prospecto.created_at ? new Date(prospecto.created_at).toLocaleDateString() : 'No disponible'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Última Actualización
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {prospecto.updated_at ? new Date(prospecto.updated_at).toLocaleDateString() : 'No disponible'}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Observaciones */}
                {prospecto.observaciones && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.6, ease: "easeOut" }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText size={18} />
                      Observaciones
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {prospecto.observaciones}
                    </p>
                  </motion.div>
                )}

                {/* Historial de Llamadas */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.65, ease: "easeOut" }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Phone size={18} />
                    Historial de Llamadas ({llamadas.length})
                  </h3>
                  
                  {llamadas.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Fecha</th>
                            <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Duración</th>
                            <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Estado</th>
                            <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Interés</th>
                            <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Precio</th>
                            <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {llamadas.map((llamada, index) => (
                            <motion.tr
                              key={llamada.call_id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05, ease: "easeOut" }}
                              onClick={() => onNavigateToNatalia?.(llamada.call_id)}
                              className="border-b border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors"
                            >
                              <td className="py-2 px-2 text-gray-900 dark:text-white">
                                {new Date(llamada.fecha_llamada).toLocaleDateString('es-MX')}
                              </td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">
                                {Math.floor(llamada.duracion_segundos / 60)}:{(llamada.duracion_segundos % 60).toString().padStart(2, '0')}
                              </td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  llamada.call_status === 'finalizada' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                  llamada.call_status === 'activa' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}>
                                  {llamada.call_status}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">
                                {llamada.nivel_interes}
                              </td>
                              <td className="py-2 px-2 text-gray-900 dark:text-white">
                                ${parseFloat(llamada.precio_ofertado || '0').toLocaleString()}
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-1">
                                  {llamada.es_venta_exitosa ? (
                                    <CheckCircle size={12} className="text-green-600 dark:text-green-400" />
                                  ) : (
                                    <AlertTriangle size={12} className="text-orange-600 dark:text-orange-400" />
                                  )}
                                  <span className="text-gray-900 dark:text-white">
                                    {llamada.es_venta_exitosa ? 'Exitosa' : 'Seguimiento'}
                                  </span>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No hay llamadas registradas para este prospecto
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
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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

  // Cargar prospectos
  useEffect(() => {
    loadProspectos();
  }, []);

  const loadProspectos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading prospectos from analysisSupabase...');
      console.log('🔗 Supabase URL:', 'https://glsmifhkoaifvaegsozd.supabase.co');
      
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Prospectos query result:', { data, error });

      if (error) {
        console.error('❌ Error loading prospectos:', error);
        // Intentar con diferentes nombres de tabla
        console.log('🔍 Trying alternative table names...');
        
        const { data: altData, error: altError } = await analysisSupabase
          .from('prospect')
          .select('*')
          .limit(5);
          
        console.log('📊 Alternative table result:', { data: altData, error: altError });
        return;
      }

      console.log('✅ Prospectos loaded successfully:', data?.length || 0);
      setProspectos(data || []);
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

  const getUniqueValues = (field: keyof Prospecto) => {
    return [...new Set(prospectos.map(p => p[field]).filter(Boolean))];
  };

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
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Prospectos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredAndSortedProspectos.length} de {prospectos.length} prospectos
          </p>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar prospectos..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <select
            value={filters.etapa}
            onChange={(e) => setFilters(prev => ({ ...prev, etapa: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las etapas</option>
            {getUniqueValues('etapa').map(etapa => (
              <option key={etapa} value={etapa}>{etapa}</option>
            ))}
          </select>
          
          <select
            value={filters.score}
            onChange={(e) => setFilters(prev => ({ ...prev, score: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los scores</option>
            <option value="Q Reto">Q Reto</option>
            <option value="Q Premium">Q Premium</option>
            <option value="Q Elite">Q Elite</option>
          </select>
          
          <select
            value={filters.campana_origen}
            onChange={(e) => setFilters(prev => ({ ...prev, campana_origen: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las campañas</option>
            {getUniqueValues('campana_origen').map(campana => (
              <option key={campana} value={campana}>{campana}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setFilters({ search: '', etapa: '', score: '', campana_origen: '', dateRange: '' })}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Filter size={16} />
            Limpiar
          </button>
        </div>
      </motion.div>

      {/* Data Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {[
                  { key: 'nombre_completo', label: 'Nombre', sortable: true },
                  { key: 'whatsapp', label: 'WhatsApp', sortable: true },
                  { key: 'email', label: 'Email', sortable: true },
                  { key: 'telefono_principal', label: 'Teléfono', sortable: false },
                  { key: 'etapa', label: 'Etapa', sortable: true },
                  { key: 'score', label: 'Score', sortable: true },
                  { key: 'campana_origen', label: 'Campaña', sortable: true },
                  { key: 'created_at', label: 'Creado', sortable: true },
                  { key: 'actions', label: '', sortable: false }
                ].map(column => (
                  <th 
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                    }`}
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                          <User size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {prospecto.nombre_completo || `${prospecto.nombre} ${prospecto.apellido_paterno} ${prospecto.apellido_materno}`.trim()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {prospecto.ciudad_residencia}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {prospecto.whatsapp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {prospecto.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {prospecto.telefono_principal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prospecto.etapa || '')}`}>
                        {prospecto.etapa}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(prospecto.score || '')}`}>
                        {prospecto.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {prospecto.campana_origen}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {prospecto.created_at ? new Date(prospecto.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <ChevronRight size={16} className="text-gray-400" />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedProspectos.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <User size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron prospectos con los filtros aplicados
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Sidebar */}
      <ProspectoSidebar
        prospecto={selectedProspecto}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigateToLiveChat={onNavigateToLiveChat}
        onNavigateToNatalia={onNavigateToNatalia}
      />
    </div>
  );
};

export default ProspectosManager;
