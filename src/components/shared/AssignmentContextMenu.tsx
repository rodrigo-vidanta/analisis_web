/**
 * Componente de menú contextual para asignar prospectos a ejecutivos
 * Se muestra al hacer clic derecho sobre un prospecto o conversación
 * 
 * ACTUALIZACIÓN (Enero 2025):
 * - Coordinadores normales ahora tienen campo de búsqueda (solo su coordinación)
 * - Modal de loading bloqueante durante reasignación (no se puede cerrar)
 * - Reasignación directa sin necesidad de desasignar primero
 * - Callback para actualizar propietario silenciosamente en UI
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X, Check, Search, Loader2, AlertCircle } from 'lucide-react';
import { coordinacionService, type Ejecutivo } from '../../services/coordinacionService';
import { assignmentService } from '../../services/assignmentService';
import { prospectsService } from '../../services/prospectsService';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
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
  onAssignmentComplete?: (
    newEjecutivoId: string, 
    newEjecutivoName: string,
    ejecutivoData?: {
      coordinacion_id?: string;
      coordinacion_codigo?: string;
      coordinacion_nombre?: string;
      ejecutivo_email?: string;
    }
  ) => void;
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
  
  // Estado para modal de loading bloqueante durante reasignación
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassigningToName, setReassigningToName] = useState<string>('');
  
  // Verificar si el usuario es administrador, administrador operativo o coordinador (usando permisos efectivos)
  const { isAdmin, isAdminOperativo, isCoordinador } = useEffectivePermissions();
  
  // Estado para verificar si es coordinador de Calidad
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);

  // OPTIMIZACIÓN: Cachear coordinación del usuario para evitar consultas repetidas
  const userCoordinacionRef = useRef<string | null>(null);
  const ejecutivosCacheRef = useRef<{ coordinacionId: string; ejecutivos: Ejecutivo[]; timestamp: number } | null>(null);
  const CACHE_DURATION = 30000; // 30 segundos

  // Actualizar ejecutivoId local cuando cambia el prop
  useEffect(() => {
    setCurrentEjecutivoId(initialEjecutivoId);
  }, [initialEjecutivoId, prospectId, coordinacionId, isOpen]);

  // Cargar ejecutivos según el rol del usuario
  useEffect(() => {
    const loadEjecutivosSegunRol = async () => {
      if (!isOpen || !user?.id) return;
      
      // Verificar si es coordinador de Calidad
      let esCoordCalidad = false;
      if (isCoordinador && !isAdmin && !isAdminOperativo) {
        try {
          const { permissionsService } = await import('../../services/permissionsService');
          esCoordCalidad = await permissionsService.isCoordinadorCalidad(user.id);
          setIsCoordinadorCalidad(esCoordCalidad);
        } catch {
          // Error verificando coordinador de calidad (no crítico)
        }
      }
      
      if (isAdmin || isAdminOperativo || esCoordCalidad) {
        // Administrador, Administrador Operativo y Coordinadores de Calidad: cargar TODOS los ejecutivos
        loadAllEjecutivos(esCoordCalidad);
      } else {
        // Coordinador normal: cargar solo ejecutivos de su coordinación
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
    };
    
    loadEjecutivosSegunRol();
  }, [isOpen, user?.id, isAdmin, isAdminOperativo, isCoordinador]);

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
    } catch {
      setEjecutivos([]);
    }
  };

  const loadAllEjecutivos = async (esCoordCalidad: boolean = false) => {
    setLoading(true);
    try {
      // IMPORTANTE: Para admin, admin operativo y coordinadores de Calidad, obtener TODAS las coordinaciones
      // No filtrar por coordinaciones activas - deben poder asignar a cualquier ejecutivo/coordinación
      let todasCoordinaciones: any[] = [];
      try {
        todasCoordinaciones = await coordinacionService.getCoordinaciones();
      } catch {
        toast.error('Error al cargar coordinaciones. Mostrando todos los ejecutivos activos.');
      }
      
      // Obtener todos los ejecutivos
      const allEjecutivos = await coordinacionService.getAllEjecutivos();
      
      // IMPORTANTE: Si el usuario es admin, admin operativo o coordinador de Calidad, también incluir coordinadores
      let allCoordinadores: Ejecutivo[] = [];
      if (isAdmin || isAdminOperativo || esCoordCalidad) {
        try {
          // Intentar obtener todos los coordinadores directamente (más eficiente)
          try {
            const todosCoordinadores = await coordinacionService.getAllCoordinadores();
            
            // IMPORTANTE: Para administradores y administradores operativos, mostrar TODOS los coordinadores activos
            // No filtrar por coordinaciones activas - deben poder asignar a cualquier coordinador activo
            // independientemente de si su coordinación está activa o no
            allCoordinadores = todosCoordinadores.filter(coord => {
              const isActive = coord.is_active;
              const hasCoordinacion = !!coord.coordinacion_id;
              
              // Solo filtrar por activo y que tenga coordinación asignada
              // NO filtrar por coordinaciones activas para coordinadores
              return isActive && hasCoordinacion;
            });
            
          } catch {
            // Fallback si getAllCoordinadores falla
            
            // Fallback: obtener coordinadores de TODAS las coordinaciones (no solo activas)
            const coordinadoresPromises = todasCoordinaciones.map(async (coord) => {
              try {
                return await coordinacionService.getCoordinadoresByCoordinacion(coord.id);
              } catch {
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
            
            allCoordinadores = uniqueCoordinadores;
          }
        } catch {
          // Continuar sin coordinadores si falla
        }
      }
      
      // IMPORTANTE: Para admin, admin operativo y coordinadores de Calidad, NO filtrar por coordinaciones activas
      // Mostrar TODOS los ejecutivos activos, independientemente de si su coordinación está activa o no
      let ejecutivosFiltrados = allEjecutivos.filter(e => {
        const isActive = e.is_active;
        const hasCoordinacion = !!e.coordinacion_id;
        
        // Solo filtrar por activo y que tenga coordinación asignada
        return isActive && hasCoordinacion;
      });
      
      // Agregar coordinadores activos a la lista (admin, admin operativo y coordinadores de Calidad)
      if (isAdmin || isAdminOperativo || esCoordCalidad) {
        // Marcar todos como coordinadores
        const coordinadoresMarcados = allCoordinadores.map(c => ({
          ...c,
          is_coordinator: true
        }));
        
        ejecutivosFiltrados = [...ejecutivosFiltrados, ...coordinadoresMarcados];
      }
      
      // Si no hay ejecutivos filtrados pero hay ejecutivos activos, mostrar todos los activos
      if (ejecutivosFiltrados.length === 0 && allEjecutivos.length > 0 && !esCoordCalidad) {
        ejecutivosFiltrados = allEjecutivos.filter(e => e.is_active && e.coordinacion_id);
      }
      
      setEjecutivos(ejecutivosFiltrados);
      
    } catch {
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
      
      // Si el usuario es coordinador, también cargar coordinadores y supervisores de la misma coordinación
      if (isCoordinador && !isAdmin && !isAdminOperativo) {
        // Cargar coordinadores
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
        } catch {
          // Continuar solo con ejecutivos si falla cargar coordinadores
        }
        
        // Cargar supervisores de la misma coordinación
        try {
          const supervisoresData = await coordinacionService.getSupervisoresByCoordinacion(coordinacionId);
          
          // Agregar supervisores a la lista (marcarlos como supervisores para diferenciarlos)
          const supervisoresMarcados = supervisoresData.map(sup => ({
            ...sup,
            is_supervisor: true
          }));
          
          // Evitar duplicados (un supervisor podría ya estar en la lista de ejecutivos)
          const idsExistentes = new Set(ejecutivosData.map(e => e.id));
          const supervisoresSinDuplicar = supervisoresMarcados.filter(s => !idsExistentes.has(s.id));
          
          ejecutivosData = [...ejecutivosData, ...supervisoresSinDuplicar];
        } catch {
          // Continuar sin supervisores si falla cargar
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
  // ACTUALIZACIÓN: Modal de loading bloqueante + timeout optimista de 30 segundos
  // Si no hay error en los primeros 30 segundos, asumimos éxito y actualizamos UI
  const executeAssignment = async (ejecutivoIdToAssign: string) => {
    // Obtener el ejecutivo seleccionado primero para mostrar el nombre en el loading
    const ejecutivoSeleccionado = ejecutivos.find(e => e.id === ejecutivoIdToAssign);
    
    if (!ejecutivoSeleccionado) {
      toast.error('Ejecutivo no encontrado');
      return;
    }

    // Activar modal de loading bloqueante
    setReassigningToName(ejecutivoSeleccionado.full_name || 'usuario seleccionado');
    setIsReassigning(true);
    setAssigning(ejecutivoIdToAssign);
    
    // Variables para el timeout optimista
    let hasError = false;
    let hasCompleted = false;
    let optimisticTimeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Determinar la coordinación a usar ANTES del try-catch
    let coordinacionIdToUse: string | undefined;
    
    try {
      if (isAdmin || isAdminOperativo || isCoordinadorCalidad) {
        if (!ejecutivoSeleccionado.coordinacion_id) {
          toast.error('El ejecutivo seleccionado no tiene coordinación asignada');
          setIsReassigning(false);
          setAssigning(null);
          return;
        }
        coordinacionIdToUse = ejecutivoSeleccionado.coordinacion_id;
      } else {
        if (!currentCoordinacionId) {
          toast.error('No se puede asignar: falta coordinación del coordinador');
          setIsReassigning(false);
          setAssigning(null);
          return;
        }
        coordinacionIdToUse = currentCoordinacionId;
      }

      // Si ya tiene ejecutivo asignado, es una reasignación
      const isReasignacion = !!currentEjecutivoId;
      const reason = isReasignacion
        ? `Reasignación desde ${user?.full_name || user?.email}${isAdmin ? ' (Admin)' : isAdminOperativo ? ' (Admin Operativo)' : ''}`
        : `Asignación manual desde ${user?.full_name || user?.email}${isAdmin ? ' (Admin)' : isAdminOperativo ? ' (Admin Operativo)' : ''}`;

      // ============================================
      // TIMEOUT OPTIMISTA: 30 segundos
      // Si no hay error en 30 segundos, asumimos éxito
      // ============================================
      const OPTIMISTIC_TIMEOUT_MS = 30000; // 30 segundos
      
      optimisticTimeoutId = setTimeout(() => {
        if (!hasError && !hasCompleted) {
          hasCompleted = true;
          
          // Actualizar el estado local del ejecutivo asignado
          setCurrentEjecutivoId(ejecutivoIdToAssign);
          
          // Mostrar toast de éxito (optimista)
          toast.success(
            `Prospecto ${isReasignacion ? 'reasignado' : 'asignado'} a ${ejecutivoSeleccionado.full_name}`,
            { duration: 3000 }
          );
          
          // Llamar al callback de completado con el nuevo ejecutivo y datos adicionales
          onAssignmentComplete?.(
            ejecutivoIdToAssign, 
            ejecutivoSeleccionado.full_name || '',
            {
              coordinacion_id: coordinacionIdToUse,
              coordinacion_codigo: ejecutivoSeleccionado.coordinacion_codigo,
              coordinacion_nombre: ejecutivoSeleccionado.coordinacion_nombre,
              ejecutivo_email: ejecutivoSeleccionado.email,
            }
          );
          
          // Cerrar el modal
          setIsReassigning(false);
          setAssigning(null);
          onClose();
        }
      }, OPTIMISTIC_TIMEOUT_MS);

      // Ejecutar la asignación real
      const result = await assignmentService.assignProspectManuallyToEjecutivo(
        prospectId,
        coordinacionIdToUse,
        ejecutivoIdToAssign,
        user!.id,
        reason
      );

      // Cancelar el timeout optimista si ya respondió
      if (optimisticTimeoutId) {
        clearTimeout(optimisticTimeoutId);
        optimisticTimeoutId = null;
      }

      if (!result.success) {
        hasError = true;
        throw new Error(result.error || result.message || 'Error desconocido al asignar prospecto');
      }

      // Si ya se completó por timeout optimista, no hacer nada más
      if (hasCompleted) {
        return;
      }

      hasCompleted = true;

      // Actualizar el estado local del ejecutivo asignado
      setCurrentEjecutivoId(ejecutivoIdToAssign);

      // Mostrar toast de éxito
      toast.success(
        isReasignacion 
          ? `Prospecto reasignado a ${ejecutivoSeleccionado.full_name}` 
          : `Prospecto asignado a ${ejecutivoSeleccionado.full_name}`,
        { duration: 3000 }
      );
      
      // Llamar al callback de completado con el nuevo ejecutivo y datos adicionales
      onAssignmentComplete?.(
        ejecutivoIdToAssign, 
        ejecutivoSeleccionado.full_name || '',
        {
          coordinacion_id: coordinacionIdToUse,
          coordinacion_codigo: ejecutivoSeleccionado.coordinacion_codigo,
          coordinacion_nombre: ejecutivoSeleccionado.coordinacion_nombre,
          ejecutivo_email: ejecutivoSeleccionado.email,
        }
      );
      
      // Cerrar el modal después de un pequeño delay para que el usuario vea el cambio
      setTimeout(() => {
        setIsReassigning(false);
        onClose();
      }, 500);
    } catch (error) {
      hasError = true;
      
      // Cancelar el timeout optimista si hay error
      if (optimisticTimeoutId) {
        clearTimeout(optimisticTimeoutId);
        optimisticTimeoutId = null;
      }
      
      // Si ya se completó por timeout optimista, no mostrar error
      if (hasCompleted) {
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al asignar prospecto';
      toast.error(`Error al asignar prospecto: ${errorMessage}`);
      setIsReassigning(false);
    } finally {
      if (!hasCompleted) {
        setAssigning(null);
      }
    }
  };

  const handleAssign = async (ejecutivoIdToAssign: string, skipValidation = false) => {
    // Si es admin, admin operativo o coordinador de Calidad, saltar validación directamente
    if (isAdmin || isAdminOperativo || isCoordinadorCalidad) {
      await executeAssignment(ejecutivoIdToAssign);
      return;
    }

    // VALIDACIÓN: Solo para coordinadores normales - verificar id_dynamics antes de asignar
    if (!skipValidation && isCoordinador && !isAdmin && !isAdminOperativo && !isCoordinadorCalidad) {
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
        } catch {
          // Si no se pueden obtener los datos, permitir continuar sin validación
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
              {/* Campo de búsqueda (disponible para todos los roles con acceso) */}
              {/* Coordinadores normales: buscan solo en su coordinación */}
              {/* Admin/Admin Operativo/Coord. Calidad: buscan en todas las coordinaciones */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={
                      (isAdmin || isAdminOperativo || isCoordinadorCalidad)
                        ? "Buscar en todas las coordinaciones..."
                        : "Buscar en mi coordinación..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                {/* Indicador de contexto de búsqueda para coordinadores normales */}
                {isCoordinador && !isAdmin && !isAdminOperativo && !isCoordinadorCalidad && currentCoordinacionId && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    Solo ejecutivos, supervisores y coordinadores de tu coordinación
                  </p>
                )}
              </div>
              
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
              {/* Mostrar contador de resultados cuando hay búsqueda activa */}
              {searchTerm && (
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {filteredEjecutivos.length} {filteredEjecutivos.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
                </div>
              )}
              {/* Botón Desasignar: SOLO para admin, admin operativo y coordinadores de Calidad */}
              {/* Coordinadores normales solo pueden reasignar directamente */}
              {currentEjecutivoId && (isAdmin || isAdminOperativo || isCoordinadorCalidad) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnassign();
                  }}
                  disabled={assigning === 'unassign' || isReassigning}
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
                      if (isInactive) {
                        toast.error('Este ejecutivo está inactivo. Actívalo desde Gestión de Ejecutivos primero.', {
                          duration: 4000
                        });
                        return;
                      }
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
                          {(ejecutivo as any).is_supervisor && !isCurrentUser && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Supervisor
                            </span>
                          )}
                        </div>
                        {!isCurrentUser && (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ejecutivo.email}</p>
                            {(isAdmin || isAdminOperativo || isCoordinadorCalidad) && ejecutivo.coordinacion_nombre && (
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

      {/* Modal de Loading Bloqueante durante Reasignación */}
      {/* Este modal NO se puede cerrar hasta que termine el proceso */}
      {/* z-[9999] para estar por encima de TODOS los sidebars y modales */}
      <AnimatePresence>
        {isReassigning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center"
            // No hay onClick para cerrar - es bloqueante
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center"
            >
              {/* Spinner animado */}
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin"></div>
                <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-purple-600 animate-pulse" />
              </div>
              
              {/* Mensaje */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Reasignando prospecto
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Transfiriendo a <span className="font-medium text-purple-600 dark:text-purple-400">{reassigningToName}</span>
              </p>
              
              {/* Indicador de progreso visual */}
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span>Este proceso incluye actualización en CRM</span>
              </div>
              
              {/* Barra de progreso indeterminada */}
              <div className="mt-4 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5, 
                    ease: 'easeInOut' 
                  }}
                  style={{ width: '50%' }}
                />
              </div>
              
              {/* Mensaje de advertencia */}
              <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
                Por favor, no cierre esta ventana
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

