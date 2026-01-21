/**
 * ============================================
 * NINJA CONTEXT UTILS
 * ============================================
 * 
 * Utilidades para obtener el contexto del usuario efectivo
 * considerando el modo ninja. Estas funciones pueden ser
 * usadas por servicios que no son hooks.
 * 
 * IMPORTANTE: Esto permite que los servicios carguen datos
 * como si fueran el usuario suplantado, no el admin real.
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import { useNinjaStore } from '../stores/ninjaStore';

// ============================================
// TIPOS
// ============================================

export interface EffectiveUserContext {
  userId: string;
  roleName: string;
  coordinacionId?: string;
  coordinacionesIds: string[];
  isNinjaMode: boolean;
  realUserId?: string; // ID del admin real cuando está en modo ninja
}

// ============================================
// OBTENER CONTEXTO EFECTIVO
// ============================================

/**
 * Obtiene el contexto del usuario efectivo para servicios.
 * Si el modo ninja está activo, retorna los datos del usuario suplantado.
 * Si no, retorna null (el servicio debe usar el usuario normal).
 */
export function getNinjaContext(): EffectiveUserContext | null {
  const state = useNinjaStore.getState();
  
  if (!state.isNinjaMode || !state.targetUser) {
    return null;
  }
  
  return {
    userId: state.targetUser.id,
    roleName: state.targetUser.role_name,
    coordinacionId: state.targetUser.coordinacion_id,
    coordinacionesIds: state.targetCoordinaciones,
    isNinjaMode: true,
    realUserId: state.activatedBy || undefined,
  };
}

/**
 * Verifica si el modo ninja está activo.
 */
export function isNinjaModeActive(): boolean {
  return useNinjaStore.getState().isNinjaMode;
}

/**
 * Obtiene el ID del usuario efectivo.
 * Si el modo ninja está activo, retorna el ID del usuario suplantado.
 * Si no está activo, retorna el ID proporcionado (usuario real).
 */
export function getEffectiveUserId(realUserId: string): string {
  const ninja = getNinjaContext();
  if (ninja) {
    return ninja.userId;
  }
  return realUserId;
}

/**
 * Obtiene el rol efectivo del usuario.
 * Si el modo ninja está activo, retorna el rol del usuario suplantado.
 */
export function getEffectiveRole(realRole: string): string {
  const ninja = getNinjaContext();
  if (ninja) {
    return ninja.roleName;
  }
  return realRole;
}

/**
 * Obtiene la coordinación efectiva del usuario.
 * Si el modo ninja está activo, retorna la coordinación del usuario suplantado.
 */
export function getEffectiveCoordinacionId(realCoordinacionId: string | undefined): string | undefined {
  const ninja = getNinjaContext();
  if (ninja) {
    return ninja.coordinacionId;
  }
  return realCoordinacionId;
}

/**
 * Obtiene las coordinaciones efectivas del usuario.
 * Si el modo ninja está activo, retorna las coordinaciones del usuario suplantado.
 */
export function getEffectiveCoordinacionesIds(realCoordinacionesIds: string[]): string[] {
  const ninja = getNinjaContext();
  if (ninja) {
    return ninja.coordinacionesIds;
  }
  return realCoordinacionesIds;
}

export default {
  getNinjaContext,
  isNinjaModeActive,
  getEffectiveUserId,
  getEffectiveRole,
  getEffectiveCoordinacionId,
  getEffectiveCoordinacionesIds,
};
