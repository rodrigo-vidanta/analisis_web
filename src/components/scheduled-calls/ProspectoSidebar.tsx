import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Phone, Mail, Calendar, MapPin, DollarSign, Star,
  AlertTriangle, FileText, Users, MessageSquare, PhoneCall,
  Clock, CheckCircle, XCircle, PhoneMissed,
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { ProspectoEtapaAsignacion } from '../shared/ProspectoEtapaAsignacion';
import { coordinacionService } from '../../services/coordinacionService';
import { ScheduledCallsSection } from '../shared/ScheduledCallsSection';
import { Avatar } from '../shared/Avatar';
import { PhoneDisplay } from '../shared/PhoneDisplay';
import toast from 'react-hot-toast';
import { classifyCallStatus, CALL_STATUS_CONFIG, type CallStatusGranular } from '../../services/callStatusClassifier';
import { useAuth } from '../../contexts/AuthContext';

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

interface ProspectoData {
  id: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre_completo?: string;
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
  etapa_id?: string; // ✅ AGREGADO: FK a tabla etapas
  etapa_info?: { // ✅ AGREGADO: Datos desde JOIN
    id: string;
    codigo: string;
    nombre: string;
    color_ui: string;
    icono: string;
  } | null;
  id_dynamics?: string; // Campo necesario para visibilidad de teléfono
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
  coordinacion_id?: string;
  ejecutivo_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  ejecutivo_nombre?: string;
  ejecutivo_email?: string;
}

interface ProspectoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  onNavigateToLiveChat?: (prospectoId: string) => void;
}

export const ProspectoSidebar: React.FC<ProspectoSidebarProps> = React.memo(({ prospectoId, isOpen, onClose, onNavigateToLiveChat }) => {
  const componentIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const { user } = useAuth();
  const [prospecto, setProspecto] = useState<ProspectoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [llamadas, setLlamadas] = useState<any[]>([]);
  const lastProspectoIdRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const hasRenderedRef = useRef(false);

  useEffect(() => {
    // Solo cargar si cambió el prospectoId o si se abrió
    if (isOpen && prospectoId && prospectoId !== lastProspectoIdRef.current && !isLoadingRef.current) {
      lastProspectoIdRef.current = prospectoId;
      isLoadingRef.current = true;
      loadProspectData();
      loadLlamadasProspecto();
    } else if (!isOpen) {
      // Resetear cuando se cierra
      lastProspectoIdRef.current = '';
      isLoadingRef.current = false;
      hasRenderedRef.current = false;
      // Solo resetear si realmente se cerró (no durante StrictMode double render)
      if (prospecto || loading) {
        setProspecto(null);
        setLoading(true);
        setLlamadas([]);
      }
    }
  }, [isOpen, prospectoId]);

  const loadProspectData = async () => {
    setLoading(true);
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select(`
          *,
          etapa_info:etapa_id (
            id, codigo, nombre, color_ui, icono
          )
        `)
        .eq('id', prospectoId)
        .single();

      if (error) throw error;

      let coordinacionInfo = null;
      let ejecutivoInfo = null;
      let ejecutivoNombre: string | null = null;

      if (data.coordinacion_id) {
        try {
          coordinacionInfo = await coordinacionService.getCoordinacionById(data.coordinacion_id);
        } catch (error) {
          // Error silenciado
        }
      }

      // Priorizar asesor_asignado si existe, de lo contrario, buscar por ejecutivo_id
      if (data.asesor_asignado && data.asesor_asignado.trim() !== '') {
        ejecutivoNombre = data.asesor_asignado.trim();
      } else if (data.ejecutivo_id) {
        try {
          ejecutivoInfo = await coordinacionService.getEjecutivoById(data.ejecutivo_id);
          if (ejecutivoInfo) {
            ejecutivoNombre = ejecutivoInfo.full_name || ejecutivoInfo.nombre_completo || ejecutivoInfo.nombre || null;
          }
        } catch (error) {
          // Error silenciado
        }
      }

      setProspecto({
        ...data,
        nombre_completo: data.nombre_completo || `${data.nombre || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim(),
        coordinacion_codigo: coordinacionInfo?.codigo,
        coordinacion_nombre: coordinacionInfo?.nombre,
        ejecutivo_nombre: ejecutivoNombre || ejecutivoInfo?.full_name || null,
        ejecutivo_email: ejecutivoInfo?.email
      });
      isLoadingRef.current = false;
    } catch (error) {
      isLoadingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const loadLlamadasProspecto = async () => {
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
        return;
      }

      // Usar clasificador centralizado para todos los estados
      const llamadasClasificadas = (data || []).map((llamada: any) => {
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
      // Error silenciado
    }
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[180]"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-screen w-3/5 bg-white dark:bg-gray-900 shadow-2xl z-[190] overflow-hidden"
            style={{ top: 0, margin: 0, padding: 0, height: '100vh' }}
          >
            {loading || !prospecto ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Cargando prospecto...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Header */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  className="flex items-center justify-between p-6 border-b border-white/10 plasma-gradient-header relative"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <Avatar
                      name={prospecto.nombre_completo || prospecto.nombre_whatsapp}
                      size="2xl"
                      showIcon={false}
                      className="bg-white/20 backdrop-blur-sm shadow-lg"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {prospecto.nombre_completo}
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
                          if (prospecto?.id) {
                            onNavigateToLiveChat(prospecto.id);
                          }
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
                  {/* Etapa y Asignación - Componente Centralizado */}
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
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Email</label>
                        <div className="text-gray-900 dark:text-white font-mono">{prospecto.email || 'No disponible'}</div>
                      </div>
                      <div>
                        <PhoneDisplay
                          phone={prospecto.whatsapp}
                          prospecto={prospecto}
                          label="WhatsApp"
                          showLabel
                          size="sm"
                          copyable
                        />
                      </div>
                      <div>
                        <PhoneDisplay
                          phone={prospecto.telefono_principal}
                          prospecto={prospecto}
                          label="Teléfono"
                          showLabel
                          size="sm"
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

                  {/* Información de Viaje */}
                  {(prospecto.destino_preferencia || prospecto.tamano_grupo || prospecto.cantidad_menores !== null || prospecto.viaja_con) && (
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

                  {/* Llamadas Programadas */}
                  {prospecto && (
                    <ScheduledCallsSection
                      prospectoId={prospecto.id}
                      prospectoNombre={prospecto.nombre_completo || `${prospecto.nombre || ''} ${prospecto.apellido_paterno || ''} ${prospecto.apellido_materno || ''}`.trim() || prospecto.nombre_whatsapp || ''}
                      delay={0.6}
                      etapaId={prospecto.etapa_id}
                      etapaLegacy={prospecto.etapa}
                      userRole={user?.role_name}
                    />
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
                                className="border-b border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              >
                                <td className="py-2 px-2 text-gray-900 dark:text-white">
                                  {new Date(llamada.fecha_llamada).toLocaleDateString('es-MX')}
                                </td>
                                <td className="py-2 px-2 text-gray-900 dark:text-white">
                                  {Math.floor(llamada.duracion_segundos / 60)}:{(llamada.duracion_segundos % 60).toString().padStart(2, '0')}
                                </td>
                                <td className="py-2 px-2">
                                  {(() => {
                                    const status = (llamada.call_status || 'perdida') as CallStatusGranular;
                                    const config = CALL_STATUS_CONFIG[status] || CALL_STATUS_CONFIG.perdida;
                                    return (
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                                        {config.label}
                                      </span>
                                    );
                                  })()}
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
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  // Solo re-renderizar si cambian prospectoId o isOpen
  const propsEqual = prevProps.prospectoId === nextProps.prospectoId && 
                     prevProps.isOpen === nextProps.isOpen;
  
  return propsEqual;
});

