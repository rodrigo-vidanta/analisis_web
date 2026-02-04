/**
 * ============================================
 * NINJA MODE STORE
 * ============================================
 * 
 * Store de Zustand para el Modo Ninja que permite a los administradores
 * suplantar la sesión de cualquier usuario para ver la interfaz
 * exactamente como la vería ese usuario.
 * 
 * CARACTERÍSTICAS:
 * - Solo disponible para usuarios con rol admin
 * - Carga permisos reales del usuario suplantado
 * - Tema visual ninja (más oscuro, iconos rojos)
 * - El header mantiene el botón para salir del modo ninja
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface NinjaTargetUser {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role_name: string;
  role_display_name?: string;
  coordinacion_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface NinjaPermission {
  permission_name: string;
  module: string;
  sub_module?: string;
}

export interface NinjaState {
  // Estado del modo ninja
  isNinjaMode: boolean;
  
  // Usuario que está siendo suplantado
  targetUser: NinjaTargetUser | null;
  
  // Permisos del usuario suplantado
  targetPermissions: NinjaPermission[];
  
  // Coordinaciones del usuario suplantado (para coordinadores/supervisores)
  targetCoordinaciones: string[];
  
  // Timestamp de cuando se activó el modo ninja
  activatedAt: number | null;
  
  // ID del admin que activó el modo ninja (para auditoría)
  activatedBy: string | null;
  
  // Acciones
  activateNinjaMode: (targetUser: NinjaTargetUser, permissions: NinjaPermission[], coordinaciones: string[], adminId: string) => void;
  deactivateNinjaMode: () => void;
  
  // Helpers
  getEffectiveRole: () => string | null;
  hasNinjaPermission: (permissionName: string) => boolean;
  canAccessNinjaModule: (module: string, subModule?: string) => boolean;
}

// ============================================
// STORE
// ============================================

export const useNinjaStore = create<NinjaState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      isNinjaMode: false,
      targetUser: null,
      targetPermissions: [],
      targetCoordinaciones: [],
      activatedAt: null,
      activatedBy: null,
      
      // ============================================
      // ACTIVAR MODO NINJA
      // ============================================
      activateNinjaMode: (
        targetUser: NinjaTargetUser,
        permissions: NinjaPermission[],
        coordinaciones: string[],
        adminId: string
      ) => {
        set({
          isNinjaMode: true,
          targetUser,
          targetPermissions: permissions,
          targetCoordinaciones: coordinaciones,
          activatedAt: Date.now(),
          activatedBy: adminId,
        });
        
        // Aplicar tema ninja al documento
        document.documentElement.classList.add('ninja-mode');
        document.body.classList.add('ninja-mode');
      },
      
      // ============================================
      // DESACTIVAR MODO NINJA
      // ============================================
      deactivateNinjaMode: () => {
        set({
          isNinjaMode: false,
          targetUser: null,
          targetPermissions: [],
          targetCoordinaciones: [],
          activatedAt: null,
          activatedBy: null,
        });
        
        // Remover tema ninja del documento
        document.documentElement.classList.remove('ninja-mode');
        document.body.classList.remove('ninja-mode');
      },
      
      // ============================================
      // OBTENER ROL EFECTIVO
      // ============================================
      getEffectiveRole: () => {
        const state = get();
        if (state.isNinjaMode && state.targetUser) {
          return state.targetUser.role_name;
        }
        return null;
      },
      
      // ============================================
      // VERIFICAR PERMISO EN MODO NINJA
      // ============================================
      hasNinjaPermission: (permissionName: string) => {
        const state = get();
        if (!state.isNinjaMode) return false;
        return state.targetPermissions.some(p => p.permission_name === permissionName);
      },
      
      // ============================================
      // VERIFICAR ACCESO A MÓDULO EN MODO NINJA
      // ============================================
      canAccessNinjaModule: (module: string, subModule?: string) => {
        const state = get();
        if (!state.isNinjaMode) return false;
        
        return state.targetPermissions.some(p => {
          if (p.module !== module) return false;
          if (subModule && p.sub_module !== subModule) return false;
          return true;
        });
      },
    }),
    {
      name: 'ninja-mode-store',
      // No persistir el modo ninja entre sesiones por seguridad
      partialize: () => ({}),
    }
  )
);

// ============================================
// HOOK HELPER PARA USAR EN COMPONENTES
// ============================================

export function useNinjaMode() {
  const store = useNinjaStore();
  
  return {
    isNinjaMode: store.isNinjaMode,
    targetUser: store.targetUser,
    targetPermissions: store.targetPermissions,
    targetCoordinaciones: store.targetCoordinaciones,
    activatedAt: store.activatedAt,
    activateNinjaMode: store.activateNinjaMode,
    deactivateNinjaMode: store.deactivateNinjaMode,
    getEffectiveRole: store.getEffectiveRole,
    hasNinjaPermission: store.hasNinjaPermission,
    canAccessNinjaModule: store.canAccessNinjaModule,
    
    // Helpers adicionales
    getNinjaUserDisplay: () => {
      if (!store.targetUser) return null;
      return {
        name: store.targetUser.full_name,
        email: store.targetUser.email,
        role: store.targetUser.role_display_name || store.targetUser.role_name,
        coordinacion: store.targetUser.coordinacion_nombre,
        initial: store.targetUser.full_name?.charAt(0).toUpperCase() || 'N',
      };
    },
    
    getSessionDuration: () => {
      if (!store.activatedAt) return null;
      const duration = Date.now() - store.activatedAt;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return { minutes, seconds, formatted: `${minutes}m ${seconds}s` };
    },
  };
}

export default useNinjaStore;
