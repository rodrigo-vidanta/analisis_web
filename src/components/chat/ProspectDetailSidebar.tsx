// Golden Rules:
// 📚 Documentación: Ver src/components/chat/README.md para arquitectura del módulo Live Chat
// 📝 Cambios: Documentar en src/components/chat/CHANGELOG_LIVECHAT.md
// 📋 Verificación: Revisar CHANGELOG antes de modificar

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  PhoneMissed
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';

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
  destino_preferencia?: string[];
  tamano_grupo?: number;
  cantidad_menores?: number;
  viaja_con?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
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
  console.log('🎯 ProspectDetailSidebar - prospectoId recibido:', prospectoId);
  console.log('🎯 ProspectDetailSidebar - isOpen:', isOpen);
  
  const [prospecto, setProspecto] = useState<ProspectData | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);

  useEffect(() => {
    if (isOpen && prospectoId) {
      loadProspectData();
      loadCallHistory();
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
      setProspecto(data);
    } catch (error) {
      console.error('Error cargando datos del prospecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCallHistory = async () => {
    setLoadingCalls(true);
    console.log('🔍 DEBUG: Cargando historial de llamadas para prospectoId:', prospectoId);
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
        .eq('prospecto', prospectoId) // ✅ CORRECTO: La columna se llama 'prospecto', NO 'prospecto_id'
        .order('fecha_llamada', { ascending: false });

      if (error) {
        console.error('❌ Error cargando historial de llamadas:', error);
        throw error;
      }
      
      console.log('✅ Llamadas cargadas:', data?.length || 0, 'llamadas encontradas');
      console.log('📊 Data de llamadas:', data);
      
      setCallHistory(data || []);
    } catch (error) {
      console.error('Error cargando historial de llamadas:', error);
    } finally {
      setLoadingCalls(false);
    }
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
          >
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
                    {prospecto?.nombre?.charAt(0).toUpperCase() || 
                     prospecto?.nombre_whatsapp?.charAt(0).toUpperCase() || 
                     'P'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {prospecto?.nombre || prospecto?.nombre_whatsapp || 'Cargando...'}
                  </h2>
                  <p className="text-sm text-white/80">
                    Información del Prospecto
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
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
                {/* Estado y Prioridad */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                  className="flex items-center gap-4 flex-wrap"
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
                        Requiere atención
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
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {prospecto.observaciones}
                    </p>
                  </motion.div>
                )}

                {/* Historial de Llamadas */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.55, ease: "easeOut" }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <PhoneCall size={18} />
                    Historial de Llamadas ({callHistory.length})
                  </h3>
                  {loadingCalls ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cargando llamadas...</p>
                    </div>
                  ) : callHistory.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {callHistory.map((call) => (
                        <div 
                          key={call.call_id}
                          className="bg-white dark:bg-gray-700 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCallStatusIcon(call.call_status)}
                              <span className={`text-xs font-medium px-2 py-1 rounded ${getCallStatusColor(call.call_status)}`}>
                                {call.call_status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(call.duracion_segundos)}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(call.fecha_llamada).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {call.nivel_interes && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Interés: </span>
                                <span className="font-medium text-gray-900 dark:text-white">{call.nivel_interes}</span>
                              </div>
                            )}
                            {call.precio_ofertado && call.precio_ofertado !== '$0' && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Precio: </span>
                                <span className="font-medium text-gray-900 dark:text-white">{call.precio_ofertado}</span>
                              </div>
                            )}
                            {call.feedback_resultado && (
                              <div className="col-span-3">
                                <span className="text-gray-500 dark:text-gray-400">Resultado: </span>
                                <span className="font-medium text-gray-900 dark:text-white">{call.feedback_resultado}</span>
                              </div>
                            )}
                          </div>

                          {call.es_venta_exitosa && (
                            <div className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                              <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                              <span className="text-green-700 dark:text-green-300 font-medium">Venta Exitosa</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <PhoneMissed className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No hay llamadas registradas
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Timeline */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.6, ease: "easeOut" }}
                  className="space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={18} />
                    Timeline
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Creado:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatDate(prospecto.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Última Actualización:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatDate(prospecto.updated_at)}
                      </span>
                    </div>
                  </div>
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
        </>
      )}
    </AnimatePresence>
  );
};

