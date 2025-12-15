/**
 * Componente de menú contextual para asignar prospectos a ejecutivos
 * Se muestra al hacer clic derecho sobre un prospecto o conversación
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X, Check, Search } from 'lucide-react';
import { coordinacionService, type Ejecutivo } from '../../services/coordinacionService';
import { assignmentService } from '../../services/assignmentService';
import { prospectsService } from '../../services/prospectsService';
import { useAuth } from '../../contexts/AuthContext';
import { ProspectValidationModal } from './ProspectValidationModal';
import toast from 'react-hot-toast';

interface AssignmentContextMenuProps {
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
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAssignmentComplete?: () => void;
}

export const AssignmentContextMenu: React.FC<AssignmentContextMenuProps> = ({
  prospectId,
  coordinacionId,
  ejecutivoId: initialEjecutivoId,
  prospectData: initialProspectData,
  isOpen,
  position,
  onClose,
  onAssignmentComplete
}) => {
  const { user } = useAuth();
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [currentCoordinacionId, setCurrentCoordinacionId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [prospectData, setProspectData] = useState<{
    nombre_completo?: string | null;
    nombre_whatsapp?: string | null;
    email?: string | null;
    whatsapp?: string | null;
  } | null>(null);
  const [pendingEjecutivoId, setPendingEjecutivoId] = useState<string | null>(null);
  // Estado local para el ejecutivo asignado (se actualiza después de asignar)
  const [currentEjecutivoId, setCurrentEjecutivoId] = useState<string | undefined>(initialEjecutivoId);
  
  // Verificar si el usuario es administrador, administrador operativo o coordinador
  const isAdmin = user?.role_name === 'admin';
  const isAdminOperativo = user?.role_name === 'administrador_operativo';
  const isCoordinador = user?.role_name === 'coordinador';

  // OPTIMIZACIÓN: Cachear coordinación del usuario para evitar consultas repetidas
  const userCoordinacionRef = useRef<string | null>(null);
  const ejecutivosCacheRef = useRef<{ coordinacionId: string; ejecutivos: Ejecutivo[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 30000; // 30 segundos

  // Actualizar ejecutivoId local cuando cambia el prop
  useEffect(() => {
    console.log('📋 AssignmentContextMenu - Props recibidos:', {
      prospectId,
      coordinacionId,
      ejecutivoId: initialEjecutivoId,
      isOpen
    });
    setCurrentEjecutivoId(initialEjecutivoId);
    console.log('✅ Estado local ejecutivoId actualizado:', initialEjecutivoId);
  }, [initialEjecutivoId, prospectId, coordinacionId, isOpen]);

  // Cargar ejecutivos según el rol del usuario
  useEffect(() => {
    if (isOpen && user?.id) {
      if (isAdmin || isAdminOperativo) {
        // Administrador y Administrador Operativo: cargar TODOS los ejecutivos de coordinaciones activas
        loadAllEjecutivos();
      } else {
        // Coordinador: cargar solo ejecutivos de su coordinación
        // Si tenemos la coordinación en cache y es reciente, usar cache
        if (userCoordinacionRef.current && ejecutivosCacheRef.current && 
            ejecutivosCacheRef.current.coordinacionId === userCoordinacionRef.current &&
            Date.now() - ejecutivosCacheRef.current.timestamp < CACHE_DURATION) {
          setEjecutivos(ejecutivosCacheRef.current.ejecutivos);
          setCurrentCoordinacionId(userCoordinacionRef.current);
          setLoading(false);
          return;
        }
        loadUserCoordinacion();
      }
    }
  }, [isOpen, user?.id, isAdmin, isAdminOperativo]);

  const loadUserCoordinacion = async () => {
    try {
      // OPTIMIZACIÓN: Si ya tenemos la coordinación en cache, reutilizarla
      if (userCoordinacionRef.current) {
        setCurrentCoordinacionId(userCoordinacionRef.current);
        await loadEjecutivos(userCoordinacionRef.current);
        return;
      }

      const { permissionsService } = await import('../../services/permissionsService');
      
      // Usar getCoordinacionesFilter para obtener todas las coordinaciones del coordinador
      const userCoordinaciones = await permissionsService.getCoordinacionesFilter(user!.id);
      
      if (userCoordinaciones && userCoordinaciones.length > 0) {
        // Usar la primera coordinación (o podríamos permitir seleccionar si hay múltiples)
        const userCoordinacionId = userCoordinaciones[0];
        
        // Guardar en cache
        userCoordinacionRef.current = userCoordinacionId;
        setCurrentCoordinacionId(userCoordinacionId);
        
        // Cargar ejecutivos después de obtener la coordinación
        await loadEjecutivos(userCoordinacionId);
      } else {
        setEjecutivos([]);
      }
    } catch (error) {
      console.error('Error cargando coordinación:', error);
      setEjecutivos([]);
    }
  };

  const loadAllEjecutivos = async () => {
    setLoading(true);
    try {
      // Obtener coordinaciones activas directamente (sin usar función RPC que no existe)
      let coordinacionesActivas: any[] = [];
      try {
        // Usar getCoordinaciones() directamente y filtrar por activas
        const todasCoordinaciones = await coordinacionService.getCoordinaciones();
        // Filtrar solo las activas y no archivadas
        coordinacionesActivas = todasCoordinaciones.filter(c => {
          const isActive = c.is_active === true;
          const notArchived = c.archivado === false || c.archivado === undefined;
          return isActive && notArchived;
        });
        
        console.log(`📋 [loadAllEjecutivos] Coordinaciones activas encontradas: ${coordinacionesActivas.length}`, coordinacionesActivas.map(c => ({
          id: c.id,
          nombre: c.nombre,
          is_active: c.is_active,
          archivado: c.archivado
        })));
      } catch (coordError) {
        console.error('Error obteniendo coordinaciones:', coordError);
        toast.error('Error al cargar coordinaciones. Mostrando todos los ejecutivos activos.');
      }
      
      const coordinacionesActivasIds = coordinacionesActivas.length > 0 
        ? new Set(coordinacionesActivas.map(c => c.id))
        : null; // Si no hay coordinaciones, no filtrar por coordinación
      
      console.log(`📋 [loadAllEjecutivos] Coordinaciones activas IDs (Set):`, coordinacionesActivasIds ? Array.from(coordinacionesActivasIds) : 'null');
      
      // Obtener todos los ejecutivos
      const allEjecutivos = await coordinacionService.getAllEjecutivos();
      
      // IMPORTANTE: Si el usuario es admin o admin operativo, también incluir coordinadores
      let allCoordinadores: Ejecutivo[] = [];
      if (isAdmin || isAdminOperativo) {
        try {
          console.log(`🔍 [loadAllEjecutivos] Cargando coordinadores para admin/admin operativo`);
          
          // Intentar obtener todos los coordinadores directamente (más eficiente)
          try {
            const todosCoordinadores = await coordinacionService.getAllCoordinadores();
            console.log(`📋 [loadAllEjecutivos] getAllCoordinadores() devolvió ${todosCoordinadores.length} coordinadores`);
            console.log(`📋 [loadAllEjecutivos] Coordinaciones activas IDs:`, coordinacionesActivasIds ? Array.from(coordinacionesActivasIds) : 'null');
            console.log(`📋 [loadAllEjecutivos] Primeros 3 coordinadores:`, todosCoordinadores.slice(0, 3).map(c => ({
              id: c.id,
              nombre: c.full_name,
              coordinacion_id: c.coordinacion_id,
              is_active: c.is_active
            })));
            
            // IMPORTANTE: Para administradores, mostrar TODOS los coordinadores activos
            // No filtrar por coordinaciones activas (ese filtro solo aplica a ejecutivos)
            // Los administradores deben poder asignar a cualquier coordinador activo
            allCoordinadores = todosCoordinadores.filter(coord => {
              const isActive = coord.is_active;
              const hasCoordinacion = !!coord.coordinacion_id;
              
              // Solo filtrar por activo y que tenga coordinación asignada
              // NO filtrar por coordinaciones activas para coordinadores
              const pasaFiltro = isActive && hasCoordinacion;
              
              if (!pasaFiltro && todosCoordinadores.indexOf(coord) < 3) {
                console.log(`🚫 [loadAllEjecutivos] Coordinador ${coord.full_name} filtrado:`, {
                  isActive,
                  hasCoordinacion,
                  coordinacion_id: coord.coordinacion_id
                });
              }
              
              return pasaFiltro;
            });
            
            console.log(`✅ [loadAllEjecutivos] ${allCoordinadores.length} coordinadores filtrados de ${todosCoordinadores.length} totales`);
            if (allCoordinadores.length === 0 && todosCoordinadores.length > 0) {
              console.warn(`⚠️ [loadAllEjecutivos] Todos los coordinadores fueron filtrados. Muestra de coordinadores:`, todosCoordinadores.slice(0, 5).map(c => ({
                nombre: c.full_name,
                coordinacion_id: c.coordinacion_id,
                is_active: c.is_active
              })));
            }
          } catch (getAllError) {
            console.warn('⚠️ [loadAllEjecutivos] getAllCoordinadores() falló, intentando por coordinación:', getAllError);
            
            // Fallback: obtener coordinadores por coordinación
            const coordinadoresPromises = coordinacionesActivas.map(async (coord) => {
              try {
                const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coord.id);
                console.log(`📋 [loadAllEjecutivos] Coordinación ${coord.nombre} (${coord.id}): ${coordinadores.length} coordinadores encontrados`);
                return coordinadores;
              } catch (error) {
                console.error(`❌ [loadAllEjecutivos] Error cargando coordinadores de ${coord.nombre}:`, error);
                return [];
              }
            });
            
            const coordinadoresArrays = await Promise.all(coordinadoresPromises);
            
            // Aplanar y marcar como coordinadores
            allCoordinadores = coordinadoresArrays.flat().map(coord => ({
              ...coord,
              is_coordinator: true
            }));
            
            // Eliminar duplicados por ID (un coordinador puede estar en múltiples coordinaciones)
            const uniqueCoordinadores = Array.from(
              new Map(allCoordinadores.map(coord => [coord.id, coord])).values()
            );
            
            console.log(`✅ [loadAllEjecutivos] Cargados ${uniqueCoordinadores.length} coordinadores únicos para asignación (de ${allCoordinadores.length} totales antes de deduplicar)`);
            allCoordinadores = uniqueCoordinadores;
          }
        } catch (coordError) {
          console.error('❌ [loadAllEjecutivos] Error cargando coordinadores para admin:', coordError);
          // Continuar sin coordinadores si falla
        }
      }
      
      // Filtrar: solo ejecutivos activos
      // Si hay coordinaciones activas, filtrar por ellas también
      let ejecutivosFiltrados = allEjecutivos.filter(e => {
        const isActive = e.is_active;
        const hasCoordinacion = !!e.coordinacion_id;
        const isInActiveCoordinacion = coordinacionesActivasIds 
          ? coordinacionesActivasIds.has(e.coordinacion_id || '')
          : true; // Si no hay coordinaciones activas, incluir todos
        
        return isActive && hasCoordinacion && isInActiveCoordinacion;
      });
      
      // Agregar coordinadores activos a la lista (solo para admin/admin operativo)
      // NOTA: Los coordinadores ya fueron filtrados arriba, así que aquí solo los agregamos
      if (isAdmin || isAdminOperativo) {
        console.log(`🔍 [loadAllEjecutivos] Agregando ${allCoordinadores.length} coordinadores ya filtrados a la lista`);
        
        // Marcar todos como coordinadores (por si acaso)
        const coordinadoresMarcados = allCoordinadores.map(c => ({
          ...c,
          is_coordinator: true
        }));
        
        console.log(`✅ [loadAllEjecutivos] ${coordinadoresMarcados.length} coordinadores agregados a la lista`);
        console.log(`📋 [loadAllEjecutivos] Coordinadores agregados:`, coordinadoresMarcados.map(c => ({
          id: c.id,
          nombre: c.full_name,
          email: c.email,
          coordinacion_id: c.coordinacion_id,
          is_coordinator: c.is_coordinator
        })));
        
        ejecutivosFiltrados = [...ejecutivosFiltrados, ...coordinadoresMarcados];
      }
      
      // Si no hay ejecutivos filtrados pero hay ejecutivos activos, mostrar todos los activos
      if (ejecutivosFiltrados.length === 0 && allEjecutivos.length > 0) {
        ejecutivosFiltrados = allEjecutivos.filter(e => e.is_active && e.coordinacion_id);
      }
      
      setEjecutivos(ejecutivosFiltrados);
      
      if (ejecutivosFiltrados.length === 0) {
        console.warn('No hay ejecutivos disponibles:', {
          totalEjecutivos: allEjecutivos.length,
          ejecutivosActivos: allEjecutivos.filter(e => e.is_active).length,
          coordinacionesActivas: coordinacionesActivas.length,
          coordinadoresCargados: allCoordinadores.length
        });
      }
    } catch (error) {
      console.error('Error al cargar ejecutivos:', error);
      toast.error('Error al cargar ejecutivos');
      setEjecutivos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEjecutivos = async (coordinacionIdToUse?: string) => {
    const coordinacionId = coordinacionIdToUse || currentCoordinacionId;
    if (!coordinacionId) {
      setEjecutivos([]);
      return;
    }

    // OPTIMIZACIÓN: Verificar cache primero
    if (ejecutivosCacheRef.current && 
        ejecutivosCacheRef.current.coordinacionId === coordinacionId &&
        Date.now() - ejecutivosCacheRef.current.timestamp < CACHE_DURATION) {
      setEjecutivos(ejecutivosCacheRef.current.ejecutivos);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Primero intentar con ejecutivos activos
      let ejecutivosData = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      
      // Si el usuario es coordinador, también cargar coordinadores de la misma coordinación
      if (isCoordinador && !isAdmin && !isAdminOperativo) {
        try {
          const coordinadoresData = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
          
          // Agregar coordinadores a la lista (marcarlos como coordinadores para diferenciarlos)
          // IMPORTANTE: Incluir al usuario actual si es coordinador
          const coordinadoresMarcados = coordinadoresData.map(coord => ({
            ...coord,
            is_coordinator: true
          }));
          
          // Verificar si el usuario actual está en la lista de coordinadores
          const usuarioActualEnLista = coordinadoresMarcados.some(c => c.id === user!.id);
          if (!usuarioActualEnLista && user!.id) {
            // Agregar al usuario actual si no está en la lista
            coordinadoresMarcados.push({
              id: user!.id,
              email: user!.email || '',
              full_name: user!.full_name || '',
              coordinacion_id: coordinacionId,
              is_active: true,
              email_verified: true,
              created_at: new Date().toISOString(),
              is_coordinator: true
            });
          }
          
          ejecutivosData = [...ejecutivosData, ...coordinadoresMarcados];
        } catch (coordError) {
          // Continuar solo con ejecutivos si falla cargar coordinadores
        }
      }
      
      // Si no hay ejecutivos activos, obtener todos (incluyendo inactivos) para mostrar con indicador
      if (ejecutivosData.length === 0) {
        // Obtener todos los ejecutivos de esta coordinación (sin filtro is_active)
        const allEjecutivos = await coordinacionService.getAllEjecutivos();
        const ejecutivosEnEstaCoordinacion = allEjecutivos.filter(e => e.coordinacion_id === coordinacionId);
        
        if (ejecutivosEnEstaCoordinacion.length > 0) {
          const ejecutivosInactivos = ejecutivosEnEstaCoordinacion.filter(e => !e.is_active);
          
          // Mostrar ejecutivos inactivos en el menú con indicador visual
          if (ejecutivosInactivos.length > 0) {
            ejecutivosData = ejecutivosInactivos.map(e => ({ ...e, is_active: false }));
            
            // Mostrar mensaje informativo al usuario
            toast.error(`${ejecutivosInactivos.length} ejecutivo(s) inactivo(s) encontrado(s). Actívalos desde Gestión de Ejecutivos para poder asignarlos.`, {
              duration: 5000
            });
          }
        }
      }
      
      // Guardar en cache
      ejecutivosCacheRef.current = {
        coordinacionId,
        ejecutivos: ejecutivosData,
        timestamp: Date.now()
      };
      
      setEjecutivos(ejecutivosData);
    } catch (error) {
      toast.error('Error al cargar ejecutivos');
      setEjecutivos([]);
    } finally {
      setLoading(false);
    }
  };

  // Función interna para ejecutar la asignación (sin validación)
  const executeAssignment = async (ejecutivoIdToAssign: string) => {
    console.log('🚀 executeAssignment iniciado:', ejecutivoIdToAssign);
    console.log('📋 Estado actual:', {
      ejecutivosCount: ejecutivos.length,
      prospectId,
      currentEjecutivoId,
      isAdmin,
      isAdminOperativo
    });
    
    setAssigning(ejecutivoIdToAssign);
    try {
      // Obtener el ejecutivo seleccionado para obtener su coordinación
      console.log('🔍 Buscando ejecutivo en lista:', ejecutivoIdToAssign);
      const ejecutivoSeleccionado = ejecutivos.find(e => e.id === ejecutivoIdToAssign);
      
      if (!ejecutivoSeleccionado) {
        console.error('❌ Ejecutivo no encontrado en lista');
        console.log('📋 Ejecutivos disponibles:', ejecutivos.map(e => ({ id: e.id, name: e.full_name })));
        toast.error('Ejecutivo no encontrado');
        setAssigning(null);
        return;
      }

      console.log('✅ Ejecutivo encontrado:', {
        id: ejecutivoSeleccionado.id,
        name: ejecutivoSeleccionado.full_name,
        coordinacion_id: ejecutivoSeleccionado.coordinacion_id
      });

      // Determinar la coordinación a usar
      let coordinacionIdToUse: string;
      
      if (isAdmin || isAdminOperativo) {
        console.log('👤 Usuario admin/admin operativo, usando coordinación del ejecutivo');
        // Admin y Admin Operativo: usar la coordinación del ejecutivo seleccionado
        if (!ejecutivoSeleccionado.coordinacion_id) {
          console.error('❌ Ejecutivo no tiene coordinación asignada');
          toast.error('El ejecutivo seleccionado no tiene coordinación asignada');
          setAssigning(null);
          return;
        }
        
        // Verificar que la coordinación del ejecutivo esté activa (con manejo de errores robusto)
        coordinacionIdToUse = ejecutivoSeleccionado.coordinacion_id;
        console.log('🔍 Verificando coordinación:', coordinacionIdToUse);
        
        // Verificación de coordinación opcional (no bloquea la asignación)
        try {
          console.log('🔍 Verificando coordinación:', coordinacionIdToUse);
          const coordinacion = await coordinacionService.getCoordinacionById(coordinacionIdToUse);
          console.log('📋 Coordinación obtenida:', coordinacion ? { id: coordinacion.id, nombre: coordinacion.nombre, is_active: coordinacion.is_active } : 'null');
          
          if (coordinacion && !coordinacion.is_active) {
            console.warn('⚠️ Coordinación no está activa, pero continuando con asignación');
            // No bloquear la asignación, solo advertir
          }
          console.log('✅ Verificación de coordinación completada');
        } catch (coordError) {
          console.warn('⚠️ No se pudo verificar el estado de la coordinación, continuando con la asignación:', coordError);
          // Si falla la verificación, continuar de todas formas (el ejecutivo tiene coordinación asignada)
        }
      } else {
        console.log('👤 Usuario coordinador, usando coordinación propia');
        // Coordinador: usar su propia coordinación
        if (!currentCoordinacionId) {
          console.error('❌ No hay coordinación del coordinador');
          toast.error('No se puede asignar: falta coordinación del coordinador');
          setAssigning(null);
          return;
        }
        coordinacionIdToUse = currentCoordinacionId;
        console.log('✅ Usando coordinación del coordinador:', coordinacionIdToUse);
      }

      // Si ya tiene ejecutivo asignado, es una reasignación
      const reason = currentEjecutivoId
        ? `Reasignación desde ${user?.full_name || user?.email}${isAdmin ? ' (Admin)' : isAdminOperativo ? ' (Admin Operativo)' : ''}`
        : `Asignación manual desde ${user?.full_name || user?.email}${isAdmin ? ' (Admin)' : isAdminOperativo ? ' (Admin Operativo)' : ''}`;

      console.log('🔍 Intentando asignar prospecto:', {
        prospectId,
        coordinacionIdToUse,
        ejecutivoIdToAssign,
        assignedBy: user!.id,
        reason
      });

      const result = await assignmentService.assignProspectManuallyToEjecutivo(
        prospectId,
        coordinacionIdToUse,
        ejecutivoIdToAssign,
        user!.id,
        reason
      );

      console.log('📦 Resultado de asignación:', result);

      if (!result.success) {
        throw new Error(result.error || result.message || 'Error desconocido al asignar prospecto');
      }

      // Actualizar el estado local del ejecutivo asignado
      setCurrentEjecutivoId(ejecutivoIdToAssign);
      console.log('✅ Ejecutivo asignado actualizado localmente:', ejecutivoIdToAssign);

      toast.success('Prospecto asignado exitosamente');
      
      // Llamar al callback de completado antes de cerrar
      onAssignmentComplete?.();
      
      // Cerrar el modal después de un pequeño delay para que el usuario vea el cambio
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('❌ Error al asignar prospecto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al asignar prospecto';
      toast.error(`Error al asignar prospecto: ${errorMessage}`);
    } finally {
      setAssigning(null);
    }
  };

  const handleAssign = async (ejecutivoIdToAssign: string, skipValidation = false) => {
    console.log('🔍 handleAssign llamado:', {
      ejecutivoIdToAssign,
      skipValidation,
      isAdmin,
      isAdminOperativo,
      isCoordinador,
      userRole: user?.role_name,
      prospectId,
      coordinacionId,
      ejecutivoId: currentEjecutivoId
    });

    // Si es admin o admin operativo, saltar validación directamente
    if (isAdmin || isAdminOperativo) {
      console.log('✅ Usuario admin/admin operativo, saltando validación');
      await executeAssignment(ejecutivoIdToAssign);
      return;
    }

    // VALIDACIÓN: Solo para coordinadores - verificar id_dynamics antes de asignar
    if (!skipValidation && isCoordinador && !isAdmin && !isAdminOperativo) {
      console.log('🔍 Validación para coordinador iniciada');
      let prospect: { id_dynamics?: string | null; nombre_completo?: string | null; nombre_whatsapp?: string | null; email?: string | null; whatsapp?: string | null } | null = null;

      // Intentar usar datos iniciales si están disponibles
      if (initialProspectData) {
        prospect = initialProspectData;
      } else {
        // Intentar obtener datos del prospecto desde el servicio
        try {
          const fetchedProspect = await prospectsService.getProspectById(prospectId, user?.id);
          if (fetchedProspect) {
            prospect = {
              id_dynamics: fetchedProspect.id_dynamics,
              nombre_completo: fetchedProspect.nombre_completo,
              nombre_whatsapp: fetchedProspect.nombre_whatsapp,
              email: fetchedProspect.email,
              whatsapp: fetchedProspect.whatsapp,
            };
          }
        } catch (error) {
          console.warn('No se pudieron obtener los datos del prospecto, continuando sin validación:', error);
          // Si no se pueden obtener los datos, permitir continuar sin validación
          // (esto puede pasar si hay problemas de autenticación)
        }
      }

      // Solo validar si tenemos datos del prospecto
      if (prospect) {
        // Verificar si tiene id_dynamics (verificar que no sea null, undefined, o cadena vacía)
        const hasIdDynamics = prospect.id_dynamics && 
          typeof prospect.id_dynamics === 'string' && 
          prospect.id_dynamics.trim() !== '';
        
        if (!hasIdDynamics) {
          // Validar si tiene nombre y email
          const hasNombre = !!(prospect.nombre_completo || prospect.nombre_whatsapp);
          const hasEmail = !!prospect.email;

          if (!hasNombre || !hasEmail) {
            // Mostrar modal de validación
            setProspectData({
              nombre_completo: prospect.nombre_completo,
              nombre_whatsapp: prospect.nombre_whatsapp,
              email: prospect.email,
              whatsapp: prospect.whatsapp,
            });
            setPendingEjecutivoId(ejecutivoIdToAssign);
            setShowValidationModal(true);
            return;
          } else {
            // Tiene nombre y email pero no id_dynamics - mostrar advertencia pero permitir continuar
            toast('El prospecto no tiene ID de Dynamics. Se recomienda registrar el prospecto en Dynamics antes de asignarlo.', {
              icon: '⚠️',
              duration: 5000,
              style: {
                background: '#FEF3C7',
                color: '#92400E',
              },
            });
            // Continuar con la asignación después de la advertencia
          }
        }
        // Si tiene id_dynamics, continuar directamente con la asignación sin validación adicional
      }
      // Si no se pudieron obtener los datos, continuar sin validación (fallback)
    }

    // Ejecutar la asignación
    console.log('✅ Validación pasada, ejecutando asignación');
    await executeAssignment(ejecutivoIdToAssign);
  };

  // Filtrar ejecutivos por término de búsqueda
  const filteredEjecutivos = useMemo(() => {
    if (!searchTerm.trim()) return ejecutivos;
    
    const searchLower = searchTerm.toLowerCase();
    return ejecutivos.filter(e => 
      e.full_name?.toLowerCase().includes(searchLower) ||
      e.email?.toLowerCase().includes(searchLower) ||
      e.coordinacion_nombre?.toLowerCase().includes(searchLower) ||
      e.coordinacion_codigo?.toLowerCase().includes(searchLower)
    );
  }, [ejecutivos, searchTerm]);

  const handleUnassign = async () => {
    if (!currentEjecutivoId) {
      toast.error('No hay ejecutivo asignado para desasignar');
      return;
    }

    if (!user?.id) {
      toast.error('Error: Usuario no identificado');
      return;
    }

    setAssigning('unassign');
    try {
      const result = await assignmentService.unassignEjecutivoFromProspect(
        prospectId,
        user.id,
        `Desasignación manual desde ${user.full_name || user.email}`
      );

      if (result.success) {
        // Actualizar el estado local del ejecutivo asignado (remover)
        setCurrentEjecutivoId(undefined);
        console.log('✅ Ejecutivo desasignado, estado local actualizado');
        
        toast.success('Ejecutivo desasignado exitosamente');
        onAssignmentComplete?.();
        
        // Cerrar el modal después de un pequeño delay
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        toast.error(result.message || 'Error al desasignar ejecutivo');
      }
    } catch (error) {
      toast.error('Error al desasignar ejecutivo');
    } finally {
      setAssigning(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[280px] max-w-[320px] max-h-[400px] overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, 0)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Asignar a Ejecutivo
                </h3>
              </div>
              {currentEjecutivoId && (() => {
                const ejecutivoAsignado = ejecutivos.find(e => e.id === currentEjecutivoId);
                return ejecutivoAsignado ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                    Actualmente asignado a: <span className="font-medium text-purple-600 dark:text-purple-400">{ejecutivoAsignado.full_name}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">
                    Ejecutivo asignado (ID: {currentEjecutivoId.substring(0, 8)}...)
                  </p>
                );
              })()}
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[320px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cargando ejecutivos...</p>
            </div>
          ) : (
            <>
              {/* Campo de búsqueda (solo para administradores y admin operativo) */}
              {(isAdmin || isAdminOperativo) && (
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar ejecutivo por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}
              
              {filteredEjecutivos.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {isCoordinador && !isAdmin && !isAdminOperativo
                  ? 'No hay ejecutivos ni coordinadores disponibles en esta coordinación'
                  : (isAdmin || isAdminOperativo)
                    ? 'No hay ejecutivos disponibles en coordinaciones activas'
                    : 'No hay ejecutivos disponibles en esta coordinación'}
              </p>
              {currentCoordinacionId && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Coordinación: {currentCoordinacionId?.substring(0, 8)}...
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {(isAdmin || isAdminOperativo)
                  ? 'No se encontraron ejecutivos activos en coordinaciones activas'
                  : isCoordinador 
                    ? 'Verifica que los ejecutivos y coordinadores tengan is_active = true'
                  : 'Verifica que los ejecutivos tengan is_ejecutivo = true e is_active = true'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {(isAdmin || isAdminOperativo) && searchTerm && (
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {filteredEjecutivos.length} {filteredEjecutivos.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
                </div>
              )}
              {currentEjecutivoId && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnassign();
                  }}
                  disabled={assigning === 'unassign'}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning === 'unassign' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      <span>Desasignando...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Desasignar ejecutivo actual</span>
                    </>
                  )}
                </button>
              )}
              
              {filteredEjecutivos.map((ejecutivo) => {
                const isInactive = !ejecutivo.is_active;
                const isCurrentlyAssigned = ejecutivo.id === currentEjecutivoId;
                const isCurrentUser = ejecutivo.id === user?.id;
                return (
                  <button
                    key={ejecutivo.id}
                    onClick={() => {
                      console.log('🔍 Click en ejecutivo:', {
                        ejecutivoId: ejecutivo.id,
                        ejecutivoName: ejecutivo.full_name,
                        isInactive,
                        isCurrentlyAssigned,
                        isCurrentUser
                      });
                      
                      if (isInactive) {
                        toast.error('Este ejecutivo está inactivo. Actívalo desde Gestión de Ejecutivos primero.', {
                          duration: 4000
                        });
                        return;
                      }
                      
                      console.log('✅ Ejecutivo activo, llamando handleAssign');
                      handleAssign(ejecutivo.id);
                    }}
                    disabled={assigning === ejecutivo.id || isInactive}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                      assigning === ejecutivo.id ? 'cursor-not-allowed opacity-50' : ''
                    } ${
                      isCurrentUser
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500'
                        : isCurrentlyAssigned
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${assigning === ejecutivo.id ? 'opacity-50 cursor-not-allowed' : ''} ${isInactive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : isCurrentlyAssigned
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {isCurrentUser ? (
                            <p className="font-semibold truncate">Asignarme este prospecto</p>
                          ) : (
                            <p className="font-medium truncate">{ejecutivo.full_name}</p>
                          )}
                          {(ejecutivo as any).is_coordinator && !isCurrentUser && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              Coordinador
                            </span>
                          )}
                        </div>
                        {!isCurrentUser && (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ejecutivo.email}</p>
                            {(isAdmin || isAdminOperativo) && ejecutivo.coordinacion_nombre && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {ejecutivo.coordinacion_codigo} - {ejecutivo.coordinacion_nombre}
                              </p>
                            )}
                          </>
                        )}
                        {isCurrentUser && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1">
                            {ejecutivo.full_name} • {ejecutivo.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCurrentlyAssigned && (
                      <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    )}
                    {isInactive && (
                      <span className="text-xs text-red-500 dark:text-red-400 flex-shrink-0 ml-2">Inactivo</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
            </>
          )}
        </div>
      </motion.div>

      {/* Modal de Validación */}
      {prospectData && (
        <ProspectValidationModal
          isOpen={showValidationModal}
          prospectId={prospectId}
          prospectData={prospectData}
          onClose={() => {
            setShowValidationModal(false);
            setProspectData(null);
            setPendingEjecutivoId(null);
          }}
          onValidationComplete={async () => {
            // Después de completar la validación, continuar con la asignación
            if (pendingEjecutivoId) {
              const ejecutivoIdToAssign = pendingEjecutivoId;
              // Cerrar el modal primero
              setShowValidationModal(false);
              setProspectData(null);
              setPendingEjecutivoId(null);
              
              // Ejecutar la asignación sin validación (ya se validó)
              await executeAssignment(ejecutivoIdToAssign);
            }
          }}
        />
      )}
    </>
  );
};

