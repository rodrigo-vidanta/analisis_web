/**
 * ============================================
 * HOOK: useNinjaAwarePermissions
 * ============================================
 * 
 * Este hook proporciona funciones de verificación de permisos que
 * consideran automáticamente si el Modo Ninja está activo.
 * 
 * Cuando el modo ninja está activo:
 * - Usa los permisos del usuario suplantado (targetUser)
 * - Simula el rol del usuario suplantado
 * 
 * Cuando el modo ninja NO está activo:
 * - Usa los permisos normales del usuario autenticado
 * 
 * IMPORTANTE: Este hook NO modifica la autenticación real,
 * solo afecta la visualización de la interfaz.
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import { useAuth } from '../contexts/AuthContext';
import { useNinjaStore } from '../stores/ninjaStore';
import { useCallback, useMemo } from 'react';

// ============================================
// TIPOS
// ============================================

interface NinjaAwarePermissions {
  // Estado
  isNinjaMode: boolean;
  
  // Usuario efectivo (real o suplantado)
  effectiveUser: {
    id: string;
    email: string;
    full_name: string;
    role_name: string;
    coordinacion_id?: string;
  } | null;
  
  // Funciones de verificación de permisos
  hasPermission: (permissionName: string) => boolean;
  canAccessModule: (module: string, subModule?: string) => boolean;
  canAccessLiveMonitor: () => boolean;
  canAccessSubModule: (subModule: 'natalia' | 'pqnc') => boolean;
  
  // Helpers de rol
  isEffectiveAdmin: boolean;
  isEffectiveCoordinador: boolean;
  isEffectiveSupervisor: boolean;
  isEffectiveEjecutivo: boolean;
  effectiveRoleName: string | null;
}

// ============================================
// MAPEO DE ROLES A PERMISOS BASE
// ============================================

// Permisos predeterminados por rol
const ROLE_DEFAULT_PERMISSIONS: Record<string, {
  modules: string[];
  subModules: string[];
  liveMonitor: boolean;
}> = {
  admin: {
    modules: ['analisis', 'prospectos', 'live-chat', 'live-monitor', 'admin', 'scheduled-calls', 'campaigns'],
    subModules: ['natalia', 'pqnc'],
    liveMonitor: true
  },
  developer: {
    modules: ['analisis', 'live-monitor', 'ai-models'],
    subModules: ['natalia', 'pqnc'],
    liveMonitor: true
  },
  coordinador: {
    modules: ['prospectos', 'live-chat', 'live-monitor', 'scheduled-calls'],
    subModules: [],
    liveMonitor: true
  },
  supervisor: {
    modules: ['prospectos', 'live-chat', 'live-monitor', 'scheduled-calls'],
    subModules: [],
    liveMonitor: true
  },
  ejecutivo: {
    modules: ['prospectos', 'live-chat', 'live-monitor', 'scheduled-calls'],
    subModules: [],
    liveMonitor: true
  },
  administrador_operativo: {
    modules: ['prospectos', 'live-chat', 'live-monitor', 'admin'],
    subModules: [],
    liveMonitor: true
  },
  productor: {
    modules: ['ai-models'],
    subModules: [],
    liveMonitor: false
  },
  evaluator: {
    modules: ['analisis'],
    subModules: ['natalia', 'pqnc'],
    liveMonitor: true
  },
  direccion: {
    modules: ['direccion'],
    subModules: [],
    liveMonitor: false
  },
  marketing: {
    modules: ['campaigns', 'support'],
    subModules: [],
    liveMonitor: false
  }
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useNinjaAwarePermissions(): NinjaAwarePermissions {
  // Estado del auth real
  const auth = useAuth();
  
  // Estado del modo ninja
  const {
    isNinjaMode,
    targetUser,
    targetPermissions,
  } = useNinjaStore();
  
  // ============================================
  // USUARIO EFECTIVO
  // ============================================
  const effectiveUser = useMemo(() => {
    if (isNinjaMode && targetUser) {
      return {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role_name: targetUser.role_name,
        coordinacion_id: targetUser.coordinacion_id,
      };
    }
    
    if (auth.user) {
      return {
        id: auth.user.id,
        email: auth.user.email,
        full_name: auth.user.full_name || '',
        role_name: auth.user.role_name,
        coordinacion_id: auth.user.coordinacion_id,
      };
    }
    
    return null;
  }, [isNinjaMode, targetUser, auth.user]);
  
  // ============================================
  // ROL EFECTIVO
  // ============================================
  const effectiveRoleName = useMemo(() => {
    if (isNinjaMode && targetUser) {
      return targetUser.role_name;
    }
    return auth.user?.role_name || null;
  }, [isNinjaMode, targetUser, auth.user]);
  
  // ============================================
  // VERIFICAR PERMISO
  // ============================================
  const hasPermission = useCallback((permissionName: string): boolean => {
    // Si NO está en modo ninja, usar auth normal
    if (!isNinjaMode) {
      return auth.hasPermission(permissionName);
    }
    
    // En modo ninja, verificar en los permisos del targetUser
    if (!targetUser || !targetPermissions) {
      return false;
    }
    
    // Verificar si el permiso existe en la lista de permisos del target
    return targetPermissions.some(p => p.permission_name === permissionName);
  }, [isNinjaMode, targetUser, targetPermissions, auth]);
  
  // ============================================
  // VERIFICAR ACCESO A MÓDULO
  // ============================================
  const canAccessModule = useCallback((module: string, subModule?: string): boolean => {
    // Si NO está en modo ninja, usar auth normal
    if (!isNinjaMode) {
      return auth.canAccessModule(module, subModule);
    }
    
    // En modo ninja
    if (!targetUser) {
      return false;
    }
    
    const role = targetUser.role_name;
    
    // Admin tiene acceso total
    if (role === 'admin') {
      return true;
    }
    
    // Obtener permisos predeterminados del rol
    const rolePerms = ROLE_DEFAULT_PERMISSIONS[role];
    if (!rolePerms) {
      // Rol desconocido - verificar en permisos específicos
      return targetPermissions.some(p => {
        if (p.module !== module) return false;
        if (subModule && p.sub_module !== subModule) return false;
        return true;
      });
    }
    
    // Verificar si el módulo está en la lista del rol
    if (!rolePerms.modules.includes(module)) {
      // Verificar permisos específicos como fallback
      return targetPermissions.some(p => p.module === module);
    }
    
    // Si se requiere submódulo, verificar
    if (subModule) {
      if (!rolePerms.subModules.includes(subModule)) {
        return targetPermissions.some(p => p.module === module && p.sub_module === subModule);
      }
    }
    
    return true;
  }, [isNinjaMode, targetUser, targetPermissions, auth]);
  
  // ============================================
  // VERIFICAR ACCESO A LIVE MONITOR
  // ============================================
  const canAccessLiveMonitor = useCallback((): boolean => {
    // Si NO está en modo ninja, usar auth normal
    if (!isNinjaMode) {
      return auth.canAccessLiveMonitor();
    }
    
    // En modo ninja
    if (!targetUser) {
      return false;
    }
    
    const role = targetUser.role_name;
    
    // Roles con acceso a Live Monitor
    const rolesWithLiveMonitor = [
      'admin',
      'developer',
      'coordinador',
      'supervisor',
      'ejecutivo',
      'administrador_operativo',
      'evaluator'
    ];
    
    if (rolesWithLiveMonitor.includes(role)) {
      return true;
    }
    
    // Verificar permisos específicos
    return targetPermissions.some(p => 
      p.module === 'live-monitor' || 
      p.permission_name === 'live_monitor.access'
    );
  }, [isNinjaMode, targetUser, targetPermissions, auth]);
  
  // ============================================
  // VERIFICAR ACCESO A SUBMÓDULO
  // ============================================
  const canAccessSubModule = useCallback((subModule: 'natalia' | 'pqnc'): boolean => {
    // Si NO está en modo ninja, usar auth normal
    if (!isNinjaMode) {
      return auth.canAccessSubModule(subModule);
    }
    
    // En modo ninja
    if (!targetUser) {
      return false;
    }
    
    const role = targetUser.role_name;
    
    // Admin y developer tienen acceso completo
    if (role === 'admin' || role === 'developer') {
      return true;
    }
    
    // Evaluators verificar permisos específicos
    if (role === 'evaluator') {
      return targetPermissions.some(p => 
        p.module === 'analisis' && p.sub_module === subModule
      );
    }
    
    return false;
  }, [isNinjaMode, targetUser, targetPermissions, auth]);
  
  // ============================================
  // HELPERS DE ROL
  // ============================================
  const isEffectiveAdmin = useMemo(() => {
    return effectiveRoleName === 'admin';
  }, [effectiveRoleName]);
  
  const isEffectiveCoordinador = useMemo(() => {
    return effectiveRoleName === 'coordinador';
  }, [effectiveRoleName]);
  
  const isEffectiveSupervisor = useMemo(() => {
    return effectiveRoleName === 'supervisor';
  }, [effectiveRoleName]);
  
  const isEffectiveEjecutivo = useMemo(() => {
    return effectiveRoleName === 'ejecutivo';
  }, [effectiveRoleName]);
  
  // ============================================
  // RETORNO
  // ============================================
  return {
    isNinjaMode,
    effectiveUser,
    effectiveRoleName,
    hasPermission,
    canAccessModule,
    canAccessLiveMonitor,
    canAccessSubModule,
    isEffectiveAdmin,
    isEffectiveCoordinador,
    isEffectiveSupervisor,
    isEffectiveEjecutivo,
  };
}

export default useNinjaAwarePermissions;
