/**
 * Widget de Prospectos - Requieren Atención
 * Muestra prospectos que requieren atención con expansión inline
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronRight, Loader2, Flag, Phone, MessageSquare, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { prospectsService, type Prospect } from '../../../services/prospectsService';
import { analysisSupabase } from '../../../config/analysisSupabase';

interface ProspectosNuevosWidgetProps {
  userId?: string;
}

interface ExpandedProspectData {
  callHistory: any[];
  highlights: any[];
  loading: boolean;
}

export const ProspectosNuevosWidget: React.FC<ProspectosNuevosWidgetProps> = ({ userId }) => {
  const [prospectos, setProspectos] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Map<string, ExpandedProspectData>>(new Map());

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadProspectos();
    
    // Suscripción realtime a prospectos
    const channel = analysisSupabase
      .channel('prospectos-nuevos-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospectos'
        },
        () => {
          loadProspectos();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (expandedId) {
      loadExpandedData(expandedId);
    }
  }, [expandedId]);

  const loadProspectos = async () => {
    if (!userId) {
      setLoading(false);
      setProspectos([]);
      return;
    }

    try {
      setLoading(true);
      // Obtener TODOS los prospectos asignados al usuario (sin límite)
      const data = await prospectsService.searchProspects(
        { limit: 1000 }, // Obtener muchos para filtrar
        userId
      );
      
      if (!data || data.length === 0) {
        setProspectos([]);
        return;
      }
      
      // Filtrar SOLO los que requieren atención humana (sin límite)
      const requierenAtencion = data.filter(p => p.requiere_atencion_humana === true);

      setProspectos(requierenAtencion); // Mostrar TODOS
    } catch (error: any) {
      console.error('Error cargando prospectos que requieren atención:', error);
      if (error?.status === 401 || error?.code === 'PGRST301') {
        console.warn('⚠️ Error de autenticación al cargar prospectos. Verificar políticas RLS.');
      }
      setProspectos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExpandedData = async (prospectoId: string) => {
    // Si ya está cargado, no recargar
    if (expandedData.has(prospectoId) && !expandedData.get(prospectoId)?.loading) {
      return;
    }

    setExpandedData(prev => {
      const newMap = new Map(prev);
      newMap.set(prospectoId, { callHistory: [], highlights: [], loading: true });
      return newMap;
    });

    try {
      // Cargar historial de llamadas
      const { data: callsData } = await analysisSupabase
        .from('llamadas_ventas')
        .select('call_id, fecha_llamada, duracion_segundos, es_venta_exitosa, call_status, tipo_llamada, nivel_interes, probabilidad_cierre, resumen_llamada')
        .eq('prospecto', prospectoId)
        .order('fecha_llamada', { ascending: false })
        .limit(5);

      // Cargar highlights (resumen de conversaciones o análisis)
      const { data: highlightsData } = await analysisSupabase
        .from('conversaciones_whatsapp')
        .select('id, summary, resultado, fecha_inicio')
        .eq('prospecto_id', prospectoId)
        .order('fecha_inicio', { ascending: false })
        .limit(3);

      setExpandedData(prev => {
        const newMap = new Map(prev);
        newMap.set(prospectoId, {
          callHistory: callsData || [],
          highlights: highlightsData || [],
          loading: false
        });
        return newMap;
      });
    } catch (error) {
      console.error('Error cargando datos expandidos:', error);
      setExpandedData(prev => {
        const newMap = new Map(prev);
        newMap.set(prospectoId, { callHistory: [], highlights: [], loading: false });
        return newMap;
      });
    }
  };

  const handleProspectoClick = (prospecto: Prospect) => {
    if (expandedId === prospecto.id) {
      setExpandedId(null);
    } else {
      setExpandedId(prospecto.id);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500 fill-red-500" />
            Prospectos - Requieren Atención
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {prospectos.length}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : prospectos.length === 0 ? (
          <div className="text-center py-8">
            <Flag className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No hay prospectos que requieran atención
            </p>
          </div>
        ) : (
          prospectos.map((prospecto, index) => {
            const isExpanded = expandedId === prospecto.id;
            const data = expandedData.get(prospecto.id);
            
            return (
              <div key={prospecto.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleProspectoClick(prospecto)}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Sin nombre'}
                        </p>
                        {prospecto.requiere_atencion_humana && (
                          <Flag className="w-3 h-3 text-red-500 fill-red-500 flex-shrink-0" />
                        )}
                      </div>
                      {prospecto.whatsapp && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {prospecto.whatsapp}
                        </p>
                      )}
                      {prospecto.motivo_handoff && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                          {prospecto.motivo_handoff.split(' ').slice(0, 8).join(' ')}
                          {prospecto.motivo_handoff.split(' ').length > 8 && '...'}
                        </p>
                      )}
                      {prospecto.etapa && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {prospecto.etapa}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </motion.div>

                {/* Contenido expandido */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-2 space-y-3 bg-gray-50 dark:bg-gray-800/50 border-x border-b border-gray-200 dark:border-gray-600 rounded-b-lg">
                        {/* Razón de atención */}
                        {prospecto.motivo_handoff && (
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">
                              Razón de Atención:
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-400">
                              {prospecto.motivo_handoff}
                            </p>
                          </div>
                        )}

                        {/* Resumen de conversación */}
                        {data?.highlights && data.highlights.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Resumen de Conversación
                            </p>
                            <div className="space-y-2">
                              {data.highlights.map((highlight: any) => (
                                <div key={highlight.id} className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                  {highlight.summary && (
                                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                      {highlight.summary}
                                    </p>
                                  )}
                                  {highlight.fecha_inicio && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {formatTime(highlight.fecha_inicio)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Historial de llamadas */}
                        {data?.loading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        ) : data?.callHistory && data.callHistory.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Historial de Llamadas ({data.callHistory.length})
                            </p>
                            <div className="space-y-2">
                              {data.callHistory.map((call: any) => (
                                <div key={call.call_id} className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                                      {formatTime(call.fecha_llamada)}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDuration(call.duracion_segundos)}
                                    </span>
                                  </div>
                                  {call.nivel_interes && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {call.nivel_interes}
                                      </span>
                                    </div>
                                  )}
                                  {call.resumen_llamada && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                      {call.resumen_llamada}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              No hay historial de llamadas
                            </p>
                          </div>
                        )}

                        {/* Highlights */}
                        {prospecto.destino_preferencia && prospecto.destino_preferencia.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                              Destinos Preferidos
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {prospecto.destino_preferencia.map((destino, idx) => (
                                <span key={idx} className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                  {destino}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
