/**
 * Widget de Prospectos - Requieren Atención
 * Muestra prospectos que requieren atención con expansión inline
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronRight, Loader2, Flag, Phone, MessageSquare, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { prospectsService, type Prospect } from '../../../services/prospectsService';
import { coordinacionService } from '../../../services/coordinacionService';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { useAppStore } from '../../../stores/appStore';
import { ProspectoSidebar } from '../../scheduled-calls/ProspectoSidebar';
import ReactMarkdown from 'react-markdown';

interface ProspectosNuevosWidgetProps {
  userId?: string;
}

interface ExpandedProspectData {
  callHistory: any[];
  highlights: any[];
  loading: boolean;
}

export const ProspectosNuevosWidget: React.FC<ProspectosNuevosWidgetProps> = ({ userId }) => {
  const { setAppMode } = useAppStore();
  const [prospectos, setProspectos] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Map<string, ExpandedProspectData>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospect | null>(null);
  const isOpeningSidebarRef = useRef(false);

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
      // Incluir el campo observaciones
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
      if (error?.status === 401 || error?.code === 'PGRST301') {
        // Error de permisos - silenciar
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
      // Cargar resumen completo de conversaciones (sin límite para mostrar todo)
      const { data: highlightsData } = await analysisSupabase
        .from('conversaciones_whatsapp')
        .select('id, summary, resultado, fecha_inicio')
        .eq('prospecto_id', prospectoId)
        .order('fecha_inicio', { ascending: false });

      setExpandedData(prev => {
        const newMap = new Map(prev);
        newMap.set(prospectoId, {
          callHistory: [],
          highlights: highlightsData || [],
          loading: false
        });
        return newMap;
      });
    } catch (error) {
      setExpandedData(prev => {
        const newMap = new Map(prev);
        newMap.set(prospectoId, { callHistory: [], highlights: [], loading: false });
        return newMap;
      });
    }
  };

  const handleProspectoClick = (prospecto: Prospect, isExpandClick: boolean = false) => {
    if (isExpandClick) {
      // Solo expandir/colapsar (botón de chevron)
      if (expandedId === prospecto.id) {
        setExpandedId(null);
      } else {
        setExpandedId(prospecto.id);
      }
      return;
    }

    // Si no es clic de expandir, hacer toggle (expandir/colapsar) Y intentar abrir la conversación
    if (!prospecto.id) return;

    // Toggle: si está expandido, colapsar; si no, expandir
    if (expandedId === prospecto.id) {
      setExpandedId(null);
    } else {
      setExpandedId(prospecto.id);
    }

    // Handler que solo se ejecuta si la conversación NO está en el top 15
    const notInTopHandler = (event: CustomEvent) => {
      // Verificar que el prospectId coincida antes de redirigir
      const eventProspectId = event.detail?.prospectId;
      if (eventProspectId && eventProspectId !== prospecto.id) {
        return; // Este evento no es para este prospecto
      }
      
      setAppMode('live-chat');
      if (prospecto.id) {
        localStorage.setItem('livechat-prospect-id', prospecto.id);
      }
    };
    
    // Escuchar el evento que indica que NO está en el top 15
    // Usar { once: true } para que solo se ejecute una vez
    window.addEventListener('conversation-not-in-top', notInTopHandler as EventListener, { once: true });
    
    // Disparar evento para que ConversacionesWidget verifique y abra si está en el top
    // Si está en el top, se abrirá en el widget (NO se disparará 'conversation-not-in-top')
    // Si NO está en el top, ConversacionesWidget disparará 'conversation-not-in-top' y se redirigirá
    const event = new CustomEvent('open-prospect-conversation', {
      detail: { prospectId: prospecto.id }
    });
    window.dispatchEvent(event);
  };

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    // Limpiar después de que la animación termine
    setTimeout(() => {
      setSelectedProspecto(null);
    }, 300);
  }, []);

  const handleProspectoNameClick = (e: React.MouseEvent, prospectoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevenir múltiples ejecuciones simultáneas
    if (isOpeningSidebarRef.current) {
      return;
    }
    
    // Si ya está abierto con el mismo prospecto, no hacer nada
    if (sidebarOpen && selectedProspecto?.id === prospectoId) {
      return;
    }
    
    isOpeningSidebarRef.current = true;
    
    // Buscar el prospecto en la lista actual (más rápido que cargar desde BD)
    const prospectoFromList = prospectos.find(p => p.id === prospectoId);
    if (prospectoFromList) {
      // Establecer AMBOS estados en el mismo batch de React (usando función de callback)
      setSelectedProspecto(prospectoFromList);
      // Usar setTimeout con 0 para asegurar que se ejecuta después del batch de React
      setTimeout(() => {
        setSidebarOpen(true);
        isOpeningSidebarRef.current = false;
      }, 0);
    } else {
      // Si no está en la lista, cargar desde BD
      prospectsService.getProspectById(prospectoId, userId).then(prospecto => {
        if (prospecto) {
          setSelectedProspecto(prospecto);
          setTimeout(() => {
            setSidebarOpen(true);
            isOpeningSidebarRef.current = false;
          }, 0);
        } else {
          isOpeningSidebarRef.current = false;
        }
      }).catch(() => {
        isOpeningSidebarRef.current = false;
      });
    }
  };

  const getInitials = (name: string | undefined | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        <div className="space-y-2">
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
          <AnimatePresence initial={false}>
            {prospectos.map((prospecto, index) => {
              const isExpanded = expandedId === prospecto.id;
              const data = expandedData.get(prospecto.id);
              
              return (
                <motion.div
                  key={prospecto.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ 
                    layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 }
                  }}
                  className="space-y-0"
                >
                  <motion.div
                    layout
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                  >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleProspectoClick(prospecto, false)}
                    >
                      <div className="flex items-center gap-2">
                        {/* Avatar con iniciales - al lado izquierdo del nombre */}
                        <div 
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProspectoNameClick(e, prospecto.id);
                          }}
                        >
                          {getInitials(prospecto.nombre_completo || prospecto.nombre_whatsapp)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p 
                              className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProspectoNameClick(e, prospecto.id);
                              }}
                            >
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
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium leading-relaxed">
                              {prospecto.motivo_handoff}
                            </p>
                          )}
                          {prospecto.etapa && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {prospecto.etapa}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProspectoClick(prospecto, true);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0 ml-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  </motion.div>

                  {/* Contenido expandido */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        layout
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                      <div className="px-3 pb-3 pt-2 space-y-3 bg-gray-50 dark:bg-gray-800/50 border-x border-b border-gray-200 dark:border-gray-600 rounded-b-lg">
                        {/* Observaciones */}
                        {prospecto.observaciones ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Observaciones
                            </p>
                            <div className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>
                                  {prospecto.observaciones}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              No hay observaciones disponibles
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        </div>
      </div>

      {/* Sidebar de Prospecto - Solo renderizar si hay prospecto seleccionado */}
      {selectedProspecto && (
        <ProspectoSidebar
          key={`prospectos-widget-${selectedProspecto.id}`}
          prospectoId={selectedProspecto.id}
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          onNavigateToLiveChat={(prospectoId) => {
            setSidebarOpen(false);
            setAppMode('live-chat');
            localStorage.setItem('livechat-prospect-id', prospectoId);
          }}
        />
      )}
    </div>
  );
};
