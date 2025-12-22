/**
 * ============================================
 * USE EFFECTIVE PERMISSIONS HOOK
 * ============================================
 * 
 * Hook que determina los permisos efectivos del usuario actual
 * considerando tanto el rol base como los grupos de permisos asignados.
 * 
 * IMPORTANTE: Este hook debe usarse en lugar de verificar directamente
 * user?.role_name === 'admin' para soportar el sistema de grupos.
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { isAdmin, isAdminOperativo, isCoordinador, hasPermission } = useEffectivePermissions();
 * 
 * if (isAdmin) {
 *   // Mostrar opciones de admin
 * }
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { groupsService, type PermissionGroup } from '../services/groupsService';

// Grupos que otorgan permisos de admin
const ADMIN_GROUPS = ['system_admin', 'full_admin'];
const ADMIN_OPERATIVO_GROUPS = ['system_admin_operativo'];
const COORDINADOR_GROUPS = ['system_coordinador'];
const SUPERVISOR_GROUPS = ['system_supervisor'];

interface EffectivePermissions {
  // Permisos efectivos (rol base + grupos)
  isAdmin: boolean;
  isAdminOperativo: boolean;
  isCoordinador: boolean;
  isSupervisor: boolean;
  isEjecutivo: boolean;
  isEvaluador: boolean;
  isDeveloper: boolean;
  
  // Rol base del usuario (sin considerar grupos)
  baseRole: string | null;
  
  // Grupos asignados al usuario
  userGroups: PermissionGroup[];
  userGroupNames: string[];
  
  // Estado de carga
  loading: boolean;
  
  // Verificar si tiene un grupo específico
  hasGroup: (groupName: string) => boolean;
  
  // Verificar si tiene alguno de los grupos dados
  hasAnyGroup: (groupNames: string[]) => boolean;
  
  // Refrescar permisos
  refresh: () => Promise<void>;
}

// Cache global para evitar múltiples llamadas
let cachedGroups: PermissionGroup[] | null = null;
let cachedUserGroups: Map<string, PermissionGroup[]> = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto

export function useEffectivePermissions(): EffectivePermissions {
  const { user } = useAuth();
  const [allGroups, setAllGroups] = useState<PermissionGroup[]>([]);
  const [userGroups, setUserGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Cargar grupos
  const loadGroups = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    const now = Date.now();
    const cacheValid = now - cacheTimestamp < CACHE_TTL;
    
    try {
      // Usar cache si es válido
      if (cacheValid && cachedGroups && cachedUserGroups.has(user.id)) {
        setAllGroups(cachedGroups);
        setUserGroups(cachedUserGroups.get(user.id) || []);
        setLoading(false);
        return;
      }
      
      // Cargar todos los grupos
      const groups = cachedGroups || await groupsService.getGroups(true);
      if (!cachedGroups) {
        cachedGroups = groups;
      }
      setAllGroups(groups);
      
      // Cargar grupos del usuario
      const userAssignments = await groupsService.getUserGroups(user.id);
      const userGroupIds = userAssignments.map(a => a.group_id);
      const userGroupsFiltered = groups.filter(g => userGroupIds.includes(g.id));
      
      // Actualizar cache
      cachedUserGroups.set(user.id, userGroupsFiltered);
      cacheTimestamp = now;
      
      setUserGroups(userGroupsFiltered);
    } catch (error) {
      console.warn('Error cargando grupos para permisos efectivos:', error);
      setUserGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);
  
  // Nombres de grupos del usuario
  const userGroupNames = useMemo(() => 
    userGroups.map(g => g.name),
    [userGroups]
  );
  
  // Verificar si tiene un grupo específico
  const hasGroup = useCallback((groupName: string) => 
    userGroupNames.includes(groupName),
    [userGroupNames]
  );
  
  // Verificar si tiene alguno de los grupos dados
  const hasAnyGroup = useCallback((groupNames: string[]) => 
    groupNames.some(name => userGroupNames.includes(name)),
    [userGroupNames]
  );
  
  // Permisos efectivos calculados
  const permissions = useMemo(() => {
    const baseRole = user?.role_name || null;
    
    // Admin: rol base O grupo de admin
    const hasAdminGroup = hasAnyGroup(ADMIN_GROUPS);
    const isAdmin = baseRole === 'admin' || hasAdminGroup;
    
    // Admin Operativo: rol base O grupo, pero NO si ya es admin
    const hasAdminOpGroup = hasAnyGroup(ADMIN_OPERATIVO_GROUPS);
    const isAdminOperativo = (baseRole === 'administrador_operativo' || hasAdminOpGroup) && !isAdmin;
    
    // Coordinador: rol base O grupo, pero NO si ya es admin/adminOp
    const hasCoordGroup = hasAnyGroup(COORDINADOR_GROUPS);
    const isCoordinador = (baseRole === 'coordinador' || hasCoordGroup) && !isAdmin && !isAdminOperativo;
    
    // Supervisor: rol base O grupo
    const hasSupervisorGroup = hasAnyGroup(SUPERVISOR_GROUPS);
    const isSupervisor = (baseRole === 'supervisor' || hasSupervisorGroup) && !isAdmin && !isAdminOperativo;
    
    // Otros roles (solo por rol base, sin elevación por grupos)
    const isEjecutivo = baseRole === 'ejecutivo' && !isAdmin && !isAdminOperativo && !isCoordinador && !isSupervisor;
    const isEvaluador = baseRole === 'evaluador' && !isAdmin && !isAdminOperativo;
    const isDeveloper = baseRole === 'developer';
    
    return {
      isAdmin,
      isAdminOperativo,
      isCoordinador,
      isSupervisor,
      isEjecutivo,
      isEvaluador,
      isDeveloper,
      baseRole
    };
  }, [user?.role_name, hasAnyGroup]);
  
  // Función para refrescar
  const refresh = useCallback(async () => {
    // Invalidar cache
    cacheTimestamp = 0;
    cachedUserGroups.delete(user?.id || '');
    await loadGroups();
  }, [user?.id, loadGroups]);
  
  return {
    ...permissions,
    userGroups,
    userGroupNames,
    loading,
    hasGroup,
    hasAnyGroup,
    refresh
  };
}

// Export para uso fuera de componentes React (servicios, etc.)
export async function getEffectivePermissions(userId: string, roleName: string): Promise<{
  isAdmin: boolean;
  isAdminOperativo: boolean;
  isCoordinador: boolean;
  isSupervisor: boolean;
}> {
  try {
    const groups = await groupsService.getGroups(true);
    const userAssignments = await groupsService.getUserGroups(userId);
    const userGroupIds = userAssignments.map(a => a.group_id);
    const userGroupNames = groups
      .filter(g => userGroupIds.includes(g.id))
      .map(g => g.name);
    
    const hasAdminGroup = ADMIN_GROUPS.some(g => userGroupNames.includes(g));
    const hasAdminOpGroup = ADMIN_OPERATIVO_GROUPS.some(g => userGroupNames.includes(g));
    const hasCoordGroup = COORDINADOR_GROUPS.some(g => userGroupNames.includes(g));
    const hasSupervisorGroup = SUPERVISOR_GROUPS.some(g => userGroupNames.includes(g));
    
    const isAdmin = roleName === 'admin' || hasAdminGroup;
    const isAdminOperativo = (roleName === 'administrador_operativo' || hasAdminOpGroup) && !isAdmin;
    const isCoordinador = (roleName === 'coordinador' || hasCoordGroup) && !isAdmin && !isAdminOperativo;
    const isSupervisor = (roleName === 'supervisor' || hasSupervisorGroup) && !isAdmin && !isAdminOperativo;
    
    return { isAdmin, isAdminOperativo, isCoordinador, isSupervisor };
  } catch {
    // Fallback a solo rol base
    return {
      isAdmin: roleName === 'admin',
      isAdminOperativo: roleName === 'administrador_operativo',
      isCoordinador: roleName === 'coordinador',
      isSupervisor: roleName === 'supervisor'
    };
  }
}

export default useEffectivePermissions;

