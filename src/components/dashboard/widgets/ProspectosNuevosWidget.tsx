/**
 * Widget de Prospectos - Requieren Atención
 * Muestra prospectos que requieren atención con expansión inline
 */

import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Flag } from 'lucide-react';
import { prospectsService, type Prospect } from '../../../services/prospectsService';
import { coordinacionService } from '../../../services/coordinacionService';
import { permissionsService } from '../../../services/permissionsService';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { useAppStore } from '../../../stores/appStore';
import { ProspectoSidebar } from '../../prospectos/ProspectosManager';
import { CallDetailModalSidebar } from '../../chat/CallDetailModalSidebar';
import { createPortal } from 'react-dom';
import { getAvatarGradient } from '../../../utils/avatarGradient';
import { systemNotificationService } from '../../../services/systemNotificationService';
import { BackupBadgeWrapper } from '../../shared/BackupBadgeWrapper';
import { PhoneText } from '../../shared/PhoneDisplay';
import { useAuth } from '../../../contexts/AuthContext';

interface ProspectosNuevosWidgetProps {
  userId?: string;
}

export const ProspectosNuevosWidget: React.FC<ProspectosNuevosWidgetProps> = ({ userId }) => {
  const { setAppMode } = useAppStore();
  const { user } = useAuth();
  const [prospectos, setProspectos] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospect | null>(null);
  const isOpeningSidebarRef = useRef(false);
  const processedProspectsRef = useRef<Set<string>>(new Set());
  const coordinacionesMapRef = useRef<Map<string, any>>(new Map());
  const ejecutivosMapRef = useRef<Map<string, any>>(new Map());
  const prospectosListRef = useRef<Prospect[]>([]);
  // Estados para el modal de detalle de llamada
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Cargar coordinaciones y ejecutivos una vez
  useEffect(() => {
    const loadCoordinacionesAndEjecutivos = async () => {
      try {
        const [coordinaciones, ejecutivos] = await Promise.all([
          coordinacionService.getCoordinaciones(), // ✅ Método correcto
          coordinacionService.getAllEjecutivos()
        ]);
        
        const coordinacionesMap = new Map();
        coordinaciones.forEach((c: any) => {
          coordinacionesMap.set(c.id, c);
        });
        
        const ejecutivosMap = new Map();
        ejecutivos.forEach((e: any) => {
          ejecutivosMap.set(e.id, e);
        });
        
        coordinacionesMapRef.current = coordinacionesMap;
        ejecutivosMapRef.current = ejecutivosMap;
      } catch (error) {
        // Silenciar errores
      }
    };
    
    loadCoordinacionesAndEjecutivos();
  }, []);

  // Obtener fecha del último mensaje para un prospecto
  const getLastMessageDate = useCallback(async (prospectoId: string): Promise<string | null> => {
    try {
      const { data } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('fecha_hora')
        .eq('prospecto_id', prospectoId)
        .order('fecha_hora', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data?.fecha_hora || null;
    } catch (error) {
      return null;
    }
  }, []);

  // Enriquecer un prospecto con coordinación y ejecutivo
  const enrichProspecto = useCallback((prospecto: any, fechaUltimoMensaje?: string): Prospect => {
    const coordinacionInfo = prospecto.coordinacion_id ? coordinacionesMapRef.current.get(prospecto.coordinacion_id) : null;
    const ejecutivoInfo = prospecto.ejecutivo_id ? ejecutivosMapRef.current.get(prospecto.ejecutivo_id) : null;
    
    // Priorizar asesor_asignado si existe
    const ejecutivoNombre = prospecto.asesor_asignado && prospecto.asesor_asignado.trim() !== ''
      ? prospecto.asesor_asignado.trim()
      : ejecutivoInfo?.full_name || ejecutivoInfo?.nombre_completo || ejecutivoInfo?.nombre || null;

    return {
      ...prospecto,
      coordinacion_codigo: coordinacionInfo?.codigo || prospecto.coordinacion_codigo,
      coordinacion_nombre: coordinacionInfo?.nombre || prospecto.coordinacion_nombre,
      ejecutivo_nombre: ejecutivoNombre || prospecto.ejecutivo_nombre,
      ejecutivo_email: ejecutivoInfo?.email || prospecto.ejecutivo_email,
      fecha_ultimo_mensaje: fechaUltimoMensaje || prospecto.fecha_ultimo_mensaje || prospecto.updated_at || prospecto.created_at
    } as Prospect & { fecha_ultimo_mensaje: string };
  }, []);

  // Función helper para ordenar prospectos por fecha_ultimo_mensaje (descendente)
  const sortProspectosByLastMessage = useCallback((prospectos: Prospect[]): Prospect[] => {
    return [...prospectos].sort((a, b) => {
      const dateA = (a as any).fecha_ultimo_mensaje 
        ? new Date((a as any).fecha_ultimo_mensaje).getTime() 
        : (a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime());
      const dateB = (b as any).fecha_ultimo_mensaje 
        ? new Date((b as any).fecha_ultimo_mensaje).getTime() 
        : (b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime());
      return dateB - dateA; // Descendente (más nuevo primero)
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadProspectos();
    
    // Suscripción realtime a prospectos
    const channel = analysisSupabase
      .channel(`prospectos-nuevos-dashboard-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prospectos'
        },
        async (payload) => {
          const newProspect = payload.new as any;
          
          // ⚠️ CRÍTICO: Verificar permisos ANTES de mostrar notificación o añadir a la lista
          if (!newProspect.id || !userId) return;
          
          // Marcar como procesado para evitar duplicados
          if (processedProspectsRef.current.has(newProspect.id)) {
            return;
          }
          
          // Verificar permisos primero
          try {
            const permissionCheck = await permissionsService.canUserAccessProspect(userId, newProspect.id);
            
            if (!permissionCheck.canAccess) {
              // Usuario no tiene acceso a este prospecto, ignorar
              return;
            }
            
            // Verificación adicional de coordinación
            const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
            const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
            
            // Verificar que el prospecto pertenezca a la coordinación correcta
            if (ejecutivoFilter) {
              // Ejecutivo: debe tener ejecutivo_id y pertenecer a su coordinación
              if (!newProspect.ejecutivo_id || !newProspect.coordinacion_id || 
                  !coordinacionesFilter || !coordinacionesFilter.includes(newProspect.coordinacion_id)) {
                return; // No pertenece a la coordinación del ejecutivo, excluir
              }
            } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              // Coordinador: debe pertenecer a su coordinación
              if (!newProspect.coordinacion_id || !coordinacionesFilter.includes(newProspect.coordinacion_id)) {
                return; // No pertenece a la coordinación del coordinador, excluir
              }
            }
            
            // ✅ PASÓ las verificaciones de permisos - ahora sí mostrar notificación y añadir
            processedProspectsRef.current.add(newProspect.id);
            
            const prospectName = newProspect.nombre_completo || newProspect.nombre_whatsapp || 'Nuevo Prospecto';
            systemNotificationService.showNewProspectNotification({
              prospectName,
              prospectId: newProspect.id
            });
            
            // Si requiere atención, añadirlo con animación
            if (newProspect.requiere_atencion_humana === true) {
              // Obtener fecha del último mensaje
              const fechaUltimoMensaje = await getLastMessageDate(newProspect.id);
              
              startTransition(() => {
                setProspectos(prev => {
                  // Verificar si ya existe
                  if (prev.find(p => p.id === newProspect.id)) {
                    return prev;
                  }
                  
                  // Enriquecer y añadir
                  const enriched = enrichProspecto(newProspect, fechaUltimoMensaje || undefined);
                  const updated = sortProspectosByLastMessage([...prev, enriched]);
                  prospectosListRef.current = updated; // Actualizar ref
                  return updated;
                });
              });
            }
          } catch (error) {
            // Silenciar errores de permisos
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospectos'
        },
        async (payload) => {
          const updatedProspect = payload.new as any;
          const oldProspect = payload.old as any;
          
          // ✅ DETECTAR CAMBIOS DE ASIGNACIÓN (ejecutivo_id o coordinacion_id)
          const ejecutivoChanged = oldProspect?.ejecutivo_id !== updatedProspect.ejecutivo_id;
          const coordinacionChanged = oldProspect?.coordinacion_id !== updatedProspect.coordinacion_id;
          const assignmentChanged = ejecutivoChanged || coordinacionChanged;
          
          // Verificar si requiere_atencion_humana cambió
          const nowRequiringAttention = updatedProspect?.requiere_atencion_humana === true;
          
          // Verificar estado anterior: primero desde payload.old, luego desde el estado actual en el ref
          let wasRequiringAttention = oldProspect?.requiere_atencion_humana === true;
          if (oldProspect === null || oldProspect === undefined || oldProspect.requiere_atencion_humana === undefined) {
            // Si no tenemos old, verificar si ya está en la lista (significa que requería atención antes)
            const existingInList = prospectosListRef.current.find(p => p.id === updatedProspect.id);
            wasRequiringAttention = existingInList !== undefined;
          }
          
          // ✅ CASO ESPECIAL: Cambio de asignación con requiere_atencion_humana = true
          // Si el prospecto requiere atención Y cambió de asignación, verificar si ahora el usuario tiene acceso
          if (assignmentChanged && nowRequiringAttention && userId) {
            const existingInList = prospectosListRef.current.find(p => p.id === updatedProspect.id);
            
            try {
              const permissionCheck = await permissionsService.canUserAccessProspect(userId, updatedProspect.id);
              const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
              const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
              
              // Verificar permisos detallados
              let hasAccess = permissionCheck.canAccess;
              if (hasAccess) {
                if (ejecutivoFilter) {
                  // Ejecutivo: verificación estricta
                  if (!updatedProspect.ejecutivo_id || !updatedProspect.coordinacion_id || 
                      !coordinacionesFilter || !coordinacionesFilter.includes(updatedProspect.coordinacion_id)) {
                    hasAccess = false;
                  }
                } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
                  // Coordinador: verificar coordinación
                  if (!updatedProspect.coordinacion_id || !coordinacionesFilter.includes(updatedProspect.coordinacion_id)) {
                    hasAccess = false;
                  }
                }
              }
              
              if (hasAccess && !existingInList) {
                // ✅ Ahora tiene acceso y no estaba en la lista - agregar
                const fechaUltimoMensaje = await getLastMessageDate(updatedProspect.id);
                startTransition(() => {
                  setProspectos(prev => {
                    if (prev.find(p => p.id === updatedProspect.id)) return prev;
                    const enriched = enrichProspecto(updatedProspect, fechaUltimoMensaje || undefined);
                    const updated = sortProspectosByLastMessage([...prev, enriched]);
                    prospectosListRef.current = updated;
                    return updated;
                  });
                });
              } else if (!hasAccess && existingInList) {
                // ❌ Ya no tiene acceso - remover
                startTransition(() => {
                  setProspectos(prev => {
                    const filtered = prev.filter(p => p.id !== updatedProspect.id);
                    prospectosListRef.current = filtered;
                    return filtered;
                  });
                });
              }
              // Si tiene acceso y ya estaba, o no tiene acceso y no estaba, no hacer nada aquí
              // El resto de la lógica de abajo lo manejará
            } catch (error) {
              // Silenciar errores
            }
            return; // Ya procesamos este caso, salir
          }
          
          // Si ahora requiere atención y antes no, añadirlo
          if (nowRequiringAttention && !wasRequiringAttention && userId) {
            // Cambió a requerir atención: verificar permisos y añadir
            permissionsService.canUserAccessProspect(userId, updatedProspect.id)
              .then(async (permissionCheck) => {
                if (permissionCheck.canAccess) {
                  // CRÍTICO: Verificación adicional de coordinación usando coordinacion_id directamente de la tabla prospectos
                  const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
                  const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
                  
                  // Verificar que el prospecto pertenezca a la coordinación correcta
                  if (ejecutivoFilter) {
                    // Ejecutivo: debe tener ejecutivo_id y pertenecer a su coordinación
                    if (!updatedProspect.ejecutivo_id || !updatedProspect.coordinacion_id || 
                        !coordinacionesFilter || !coordinacionesFilter.includes(updatedProspect.coordinacion_id)) {
                      return; // No pertenece a la coordinación del ejecutivo, excluir
                    }
                  } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
                    // Coordinador: debe pertenecer a su coordinación
                    if (!updatedProspect.coordinacion_id || !coordinacionesFilter.includes(updatedProspect.coordinacion_id)) {
                      return; // No pertenece a la coordinación del coordinador, excluir
                    }
                  }
                  
                  // Obtener fecha del último mensaje
                  const fechaUltimoMensaje = await getLastMessageDate(updatedProspect.id);
                  
                  startTransition(() => {
                    setProspectos(prev => {
                      const existingIndex = prev.findIndex(p => p.id === updatedProspect.id);
                      let updated: Prospect[];
                      if (existingIndex === -1) {
                        // No existe, añadir con animación
                        const enriched = enrichProspecto(updatedProspect, fechaUltimoMensaje || undefined);
                        updated = sortProspectosByLastMessage([...prev, enriched]);
                      } else {
                        // Ya existe, solo actualizar
                        const enriched = enrichProspecto(updatedProspect, fechaUltimoMensaje || undefined);
                        updated = [...prev];
                        updated[existingIndex] = enriched;
                        updated = sortProspectosByLastMessage(updated); // Reordenar
                      }
                      prospectosListRef.current = updated; // Actualizar ref
                      return updated;
                    });
                  });
                }
              })
              .catch(() => {
                // Silenciar errores de permisos
              });
          } else if (!nowRequiringAttention && wasRequiringAttention) {
            // Cambió a NO requerir atención: eliminar con animación
            startTransition(() => {
              setProspectos(prev => {
                const existingIndex = prev.findIndex(p => p.id === updatedProspect.id);
                if (existingIndex !== -1) {
                  const updated = prev.filter(p => p.id !== updatedProspect.id);
                  prospectosListRef.current = updated; // Actualizar ref
                  return updated;
                }
                return prev;
              });
            });
          } else if (nowRequiringAttention && wasRequiringAttention && userId) {
            // Ya requería atención y sigue requiriéndola: verificar permisos y actualizar
            permissionsService.canUserAccessProspect(userId, updatedProspect.id)
              .then(async (permissionCheck) => {
                if (permissionCheck.canAccess) {
                  // CRÍTICO: Verificación adicional de coordinación usando coordinacion_id directamente de la tabla prospectos
                  const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
                  const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
                  
                  // Verificar que el prospecto pertenezca a la coordinación correcta
                  if (ejecutivoFilter) {
                    // Ejecutivo: debe tener ejecutivo_id y pertenecer a su coordinación
                    if (!updatedProspect.ejecutivo_id || !updatedProspect.coordinacion_id || 
                        !coordinacionesFilter || !coordinacionesFilter.includes(updatedProspect.coordinacion_id)) {
                      // Ya no pertenece a la coordinación del ejecutivo, eliminar
                      startTransition(() => {
                        setProspectos(prev => {
                          const filtered = prev.filter(p => p.id !== updatedProspect.id);
                          prospectosListRef.current = filtered;
                          return filtered;
                        });
                      });
                      return;
                    }
                  } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
                    // Coordinador: debe pertenecer a su coordinación
                    if (!updatedProspect.coordinacion_id || !coordinacionesFilter.includes(updatedProspect.coordinacion_id)) {
                      // Ya no pertenece a la coordinación del coordinador, eliminar
                      startTransition(() => {
                        setProspectos(prev => {
                          const filtered = prev.filter(p => p.id !== updatedProspect.id);
                          prospectosListRef.current = filtered;
                          return filtered;
                        });
                      });
                      return;
                    }
                  }
                  
                  // Obtener fecha del último mensaje
                  const fechaUltimoMensaje = await getLastMessageDate(updatedProspect.id);
                  
                  startTransition(() => {
                    setProspectos(prev => {
                      const existingIndex = prev.findIndex(p => p.id === updatedProspect.id);
                      let updated: Prospect[];
                      if (existingIndex !== -1) {
                        // Actualizar datos
                        const enriched = enrichProspecto(updatedProspect, fechaUltimoMensaje || undefined);
                        updated = [...prev];
                        updated[existingIndex] = enriched;
                        updated = sortProspectosByLastMessage(updated); // Reordenar
                      } else {
                        // No existe pero tiene permisos, añadirlo
                        const enriched = enrichProspecto(updatedProspect, fechaUltimoMensaje || undefined);
                        updated = sortProspectosByLastMessage([...prev, enriched]);
                      }
                      prospectosListRef.current = updated; // Actualizar ref
                      return updated;
                    });
                  });
                } else {
                  // Ya no tiene permisos, eliminar
                  startTransition(() => {
                    setProspectos(prev => {
                      const filtered = prev.filter(p => p.id !== updatedProspect.id);
                      prospectosListRef.current = filtered;
                      return filtered;
                    });
                  });
                }
              })
              .catch(() => {
                // Silenciar errores de permisos
              });
          }
        }
      )
      .subscribe();

    // Suscripción realtime a mensajes_whatsapp para actualizar fecha_ultimo_mensaje y reordenar
    const mensajesChannel = analysisSupabase
      .channel(`mensajes-prospectos-nuevos-dashboard-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_whatsapp'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const prospectoId = newMessage.prospecto_id;
          
          if (!prospectoId) return;
          
          // Verificar si este prospecto está en la lista
          setProspectos(prev => {
            const existingIndex = prev.findIndex(p => p.id === prospectoId);
            if (existingIndex === -1) {
              // No está en la lista, no hacer nada
              return prev;
            }
            
            // Actualizar fecha_ultimo_mensaje y reordenar
            const updated = [...prev];
            const prospecto = updated[existingIndex];
            (prospecto as any).fecha_ultimo_mensaje = newMessage.fecha_hora;
            updated[existingIndex] = prospecto;
            
            // Reordenar por fecha_ultimo_mensaje
            const sorted = sortProspectosByLastMessage(updated);
            prospectosListRef.current = sorted;
            return sorted;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      mensajesChannel.unsubscribe();
    };
  }, [userId, enrichProspecto, getLastMessageDate, sortProspectosByLastMessage]);

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
        prospectosListRef.current = [];
        return;
      }
      
      // Filtrar SOLO los que requieren atención humana (sin límite)
      let requierenAtencion = data.filter(p => p.requiere_atencion_humana === true);

      // CRÍTICO: Filtro adicional en el cliente para asegurar que solo se muestren prospectos
      // de la coordinación correcta (usando coordinacion_id directamente de la tabla prospectos)
      if (userId) {
        const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
        const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
        
        if (ejecutivoFilter) {
          // Ejecutivo: verificar coordinación y ejecutivo_id
          // Obtener IDs de ejecutivos donde es backup
          const { supabaseSystemUIAdmin } = await import('../../../config/supabaseSystemUI');
          const { data: ejecutivosConBackup } = await supabaseSystemUIAdmin
            .from('auth_users')
            .select('id')
            .eq('backup_id', ejecutivoFilter)
            .eq('has_backup', true);
          
          const ejecutivosIdsParaFiltrar = [ejecutivoFilter];
          if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
            ejecutivosIdsParaFiltrar.push(...ejecutivosConBackup.map(e => e.id));
          }
          
          requierenAtencion = requierenAtencion.filter(p => {
            // Debe tener ejecutivo_id asignado
            if (!p.ejecutivo_id) return false;
            
            // Debe pertenecer a la coordinación del ejecutivo
            if (!p.coordinacion_id || !coordinacionesFilter || !coordinacionesFilter.includes(p.coordinacion_id)) {
              return false;
            }
            
            // El ejecutivo_id debe coincidir con el ejecutivo actual o sus backups
            return ejecutivosIdsParaFiltrar.includes(p.ejecutivo_id);
          });
        } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
          // Coordinador: verificar coordinación
          requierenAtencion = requierenAtencion.filter(p => {
            return p.coordinacion_id && coordinacionesFilter.includes(p.coordinacion_id);
          });
        }
      }

      if (requierenAtencion.length === 0) {
        setProspectos([]);
        prospectosListRef.current = [];
        return;
      }
      
      // ============================================
      // OPTIMIZACIÓN: Carga en batch de coordinaciones y ejecutivos
      // ============================================
      // Recolectar IDs únicos de coordinaciones y ejecutivos de los prospectos
      // que requieren atención para cargar sus datos completos de forma eficiente.
      const coordinacionIds = new Set<string>();
      const ejecutivoIds = new Set<string>();
      requierenAtencion.forEach(p => {
        if (p.coordinacion_id) coordinacionIds.add(p.coordinacion_id);
        if (p.ejecutivo_id) ejecutivoIds.add(p.ejecutivo_id);
      });
      
      // Cargar coordinaciones y ejecutivos en batch (más eficiente que cargar uno por uno)
      // Esto asegura que los mapas estén correctamente poblados antes de enriquecer los prospectos.
      const [coordinacionesMapData, ejecutivosMapData] = await Promise.all([
        coordinacionIds.size > 0
          ? coordinacionService.getCoordinacionesByIds(Array.from(coordinacionIds))
          : Promise.resolve(new Map()),
        ejecutivoIds.size > 0
          ? coordinacionService.getEjecutivosByIds(Array.from(ejecutivoIds))
          : Promise.resolve(new Map())
      ]);
      
      // Actualizar los refs con los datos cargados
      coordinacionesMapRef.current = coordinacionesMapData;
      ejecutivosMapRef.current = ejecutivosMapData;
      
      // Obtener fechas del último mensaje para cada prospecto
      const prospectoIds = requierenAtencion.map(p => p.id);
      const { data: lastMessagesData } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('prospecto_id, fecha_hora')
        .in('prospecto_id', prospectoIds)
        .order('fecha_hora', { ascending: false });
      
      // Crear un mapa de fecha_ultimo_mensaje por prospecto
      const lastMessageMap = new Map<string, string>();
      if (lastMessagesData) {
        lastMessagesData.forEach((msg: any) => {
          if (!lastMessageMap.has(msg.prospecto_id) || 
              new Date(msg.fecha_hora) > new Date(lastMessageMap.get(msg.prospecto_id) || '')) {
            lastMessageMap.set(msg.prospecto_id, msg.fecha_hora);
          }
        });
      }
      
      // Enriquecer con coordinación y ejecutivo, y añadir fecha_ultimo_mensaje
      const enriched = requierenAtencion.map(p => 
        enrichProspecto(p, lastMessageMap.get(p.id) || undefined)
      );

      // Ordenar por fecha_ultimo_mensaje (descendente - más nuevo primero)
      const sorted = sortProspectosByLastMessage(enriched);

      setProspectos(sorted); // Mostrar TODOS ordenados
      prospectosListRef.current = sorted; // Actualizar ref
    } catch (error: any) {
      if (error?.status === 401 || error?.code === 'PGRST301') {
        // Error de permisos - silenciar
      }
      setProspectos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProspectoClick = (prospecto: Prospect) => {
    if (!prospecto.id) return;

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
    
    // Verificar permisos antes de abrir el sidebar
    if (!userId) {
      alert('Debes estar autenticado para ver los detalles del prospecto');
      isOpeningSidebarRef.current = false;
      return;
    }
    
    // Verificar permisos primero
    import('../../../services/permissionsService').then(({ permissionsService }) => {
      permissionsService.canUserAccessProspect(userId, prospectoId).then((permissionCheck) => {
        if (!permissionCheck.canAccess) {
          alert(permissionCheck.reason || 'No tienes permiso para acceder a este prospecto');
          isOpeningSidebarRef.current = false;
          return;
        }
        
        // Si tiene permisos, buscar el prospecto en la lista actual (más rápido que cargar desde BD)
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
          // Si no está en la lista, cargar desde BD (ya verificamos permisos arriba)
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
      }).catch(() => {
        alert('Error al verificar permisos');
        isOpeningSidebarRef.current = false;
      });
    }).catch(() => {
      alert('Error al cargar el servicio de permisos');
      isOpeningSidebarRef.current = false;
    });
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
              return (
                <motion.div
                  key={prospecto.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ 
                    layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 }
                  }}
                >
                  <motion.div
                    layout
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 cursor-pointer"
                    onClick={() => handleProspectoClick(prospecto)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Avatar con iniciales - al lado izquierdo del nombre */}
                      {(() => {
                        const { gradientClass, initials } = getAvatarGradient(prospecto.nombre_completo || prospecto.nombre_whatsapp);
                        return (
                          <div 
                            className={`w-8 h-8 rounded-full ${gradientClass} flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProspectoNameClick(e, prospecto.id);
                            }}
                          >
                            {initials}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
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
                            {user?.id && prospecto.ejecutivo_id && (
                              <BackupBadgeWrapper
                                currentUserId={user.id}
                                prospectoEjecutivoId={prospecto.ejecutivo_id}
                                variant="compact"
                              />
                            )}
                          </div>
                          {/* Etiquetas de Coordinación y Ejecutivo - A la derecha del nombre */}
                          {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre) && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {prospecto.coordinacion_codigo && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 whitespace-nowrap">
                                  {prospecto.coordinacion_codigo}
                                </span>
                              )}
                              {prospecto.ejecutivo_nombre && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                                  {(() => {
                                    const nombre = prospecto.ejecutivo_nombre || '';
                                    const partes = nombre.trim().split(/\s+/);
                                    const primerNombre = partes[0] || '';
                                    const primerApellido = partes[1] || '';
                                    return primerApellido ? `${primerNombre} ${primerApellido}` : primerNombre;
                                  })()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {prospecto.whatsapp && (
                          <div className="mt-0.5">
                            <PhoneText 
                              phone={prospecto.whatsapp} 
                              prospecto={prospecto}
                              className="text-xs text-gray-500 dark:text-gray-400"
                            />
                          </div>
                        )}
                        {prospecto.motivo_handoff && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium leading-relaxed">
                            {prospecto.motivo_handoff}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {prospecto.etapa && (
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {prospecto.etapa}
                            </span>
                          )}
                          {prospecto.destino_preferencia && prospecto.destino_preferencia.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {prospecto.destino_preferencia.map((destino, idx) => (
                                <span key={idx} className="px-2 py-0.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                  {destino}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
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
          prospecto={selectedProspecto}
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          onNavigateToLiveChat={(prospectoId) => {
            setSidebarOpen(false);
            setAppMode('live-chat');
            localStorage.setItem('livechat-prospect-id', prospectoId);
          }}
          onOpenCallDetail={(callId: string) => {
            setSelectedCallId(callId);
            setCallDetailModalOpen(true);
          }}
        />
      )}

      {/* Sidebar de Detalle de Llamada */}
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
            // Abrir sidebar del prospecto si está disponible
            if (selectedProspecto?.id === prospectId) {
              // Ya está abierto
            }
          }}
        />,
        document.body
      )}
    </div>
  );
};
