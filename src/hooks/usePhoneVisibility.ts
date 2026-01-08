/**
 * ============================================
 * USE PHONE VISIBILITY HOOK
 * ============================================
 * 
 * Hook que determina si el usuario actual puede ver el teléfono
 * de un prospecto basado en reglas de seguridad.
 * 
 * REGLAS DE VISIBILIDAD:
 * - Admin: siempre puede ver
 * - Administrador Operativo: siempre puede ver
 * - Coordinador de Calidad: siempre puede ver
 * - Coordinador (otros): solo si prospecto tiene id_dynamics, es "Activo PQNC" o "Es miembro"
 * - Ejecutivo: solo si prospecto tiene id_dynamics, es "Activo PQNC" o "Es miembro"
 * - Otros roles: no pueden ver teléfonos
 * 
 * ETAPAS CON VISIBILIDAD SIEMPRE:
 * - "Activo PQNC"
 * - "Es miembro"
 * 
 * @example
 * ```tsx
 * const { canViewPhone, maskPhone } = usePhoneVisibility();
 * 
 * // Verificar si puede ver teléfono
 * const visible = canViewPhone(prospecto);
 * 
 * // O enmascarar directamente
 * const display = maskPhone(prospecto.telefono_principal, prospecto);
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEffectivePermissions } from './useEffectivePermissions';
import { permissionsService } from '../services/permissionsService';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface ProspectoPhoneData {
  id_dynamics?: string | null;
  etapa?: string | null;
  // Campos de teléfono opcionales para validación
  telefono_principal?: string | null;
  whatsapp?: string | null;
  telefono_alternativo?: string | null;
}

export interface PhoneVisibilityResult {
  /** Si el usuario puede ver teléfonos del prospecto dado */
  canViewPhone: (prospecto: ProspectoPhoneData) => boolean;
  
  /** Enmascara el teléfono si no tiene permiso, retorna el valor real si sí tiene */
  maskPhone: (phone: string | null | undefined, prospecto: ProspectoPhoneData) => string;
  
  /** Si el usuario tiene permiso global (admin, coord calidad, etc.) */
  hasGlobalAccess: boolean;
  
  /** Si es coordinador de calidad */
  isCoordinadorCalidad: boolean;
  
  /** Estado de carga del permiso de coordinador de calidad */
  loading: boolean;
}

// ============================================
// CONSTANTES
// ============================================

/** Etapas que siempre permiten ver el teléfono */
const ETAPAS_CON_VISIBILIDAD = ['Activo PQNC', 'Es miembro'];

/** Texto que se muestra cuando el teléfono está oculto */
const PHONE_MASKED_TEXT = '••••••••••';

/** Mensaje para usuarios sin acceso */
const PHONE_HIDDEN_REASON = 'Requiere ID Dynamics';

// ============================================
// HOOK PRINCIPAL
// ============================================

export function usePhoneVisibility(): PhoneVisibilityResult {
  const { user } = useAuth();
  const { isAdmin, isAdminOperativo, isCoordinador, isSupervisor, isEjecutivo, loading: permissionsLoading } = useEffectivePermissions();
  
  const [isCoordinadorCalidad, setIsCoordinadorCalidad] = useState(false);
  const [calidadLoading, setCalidadLoading] = useState(true);
  
  // Verificar si es coordinador de calidad
  useEffect(() => {
    const checkCalidad = async () => {
      if (!user?.id || !isCoordinador) {
        setIsCoordinadorCalidad(false);
        setCalidadLoading(false);
        return;
      }
      
      try {
        const isCalidad = await permissionsService.isCoordinadorCalidad(user.id);
        setIsCoordinadorCalidad(isCalidad);
      } catch (error) {
        console.error('Error verificando coordinador de calidad:', error);
        setIsCoordinadorCalidad(false);
      } finally {
        setCalidadLoading(false);
      }
    };
    
    checkCalidad();
  }, [user?.id, isCoordinador]);
  
  // Si el usuario tiene acceso global (puede ver todos los teléfonos)
  // SOLO Admin y Coordinadores de Calidad tienen acceso global
  // Administrador Operativo, Coordinadores normales y Ejecutivos tienen restricciones
  const hasGlobalAccess = useMemo(() => {
    return isAdmin || isCoordinadorCalidad;
  }, [isAdmin, isCoordinadorCalidad]);
  
  /**
   * Determina si un prospecto tiene una etapa que permite ver teléfono
   */
  const hasVisibleEtapa = useCallback((etapa: string | null | undefined): boolean => {
    if (!etapa) return false;
    const etapaLower = etapa.toLowerCase().trim();
    return ETAPAS_CON_VISIBILIDAD.some(e => e.toLowerCase() === etapaLower);
  }, []);
  
  /**
   * Verifica si el usuario puede ver el teléfono del prospecto
   */
  const canViewPhone = useCallback((prospecto: ProspectoPhoneData): boolean => {
    // Usuarios con acceso global siempre pueden ver (Admin y Coord. Calidad)
    if (hasGlobalAccess) return true;
    
    // Roles con acceso restringido: AdminOp, Coordinadores (no calidad), Supervisores, Ejecutivos
    // Solo pueden ver si el prospecto cumple las condiciones
    if (!isAdminOperativo && !isCoordinador && !isSupervisor && !isEjecutivo) {
      // Otros roles no tienen acceso a teléfonos
      return false;
    }
    
    // AdminOp, Coordinadores (no calidad), Supervisores y Ejecutivos:
    // - Pueden ver si el prospecto tiene id_dynamics
    // - O si la etapa es "Activo PQNC" o "Es miembro"
    
    if (prospecto.id_dynamics && prospecto.id_dynamics.trim() !== '') {
      return true;
    }
    
    if (hasVisibleEtapa(prospecto.etapa)) {
      return true;
    }
    
    return false;
  }, [hasGlobalAccess, isAdminOperativo, isCoordinador, isSupervisor, isEjecutivo, hasVisibleEtapa]);
  
  /**
   * Enmascara o muestra el teléfono según permisos
   */
  const maskPhone = useCallback((
    phone: string | null | undefined,
    prospecto: ProspectoPhoneData
  ): string => {
    if (!phone) return 'No disponible';
    
    if (canViewPhone(prospecto)) {
      return phone;
    }
    
    return PHONE_MASKED_TEXT;
  }, [canViewPhone]);
  
  return {
    canViewPhone,
    maskPhone,
    hasGlobalAccess,
    isCoordinadorCalidad,
    loading: permissionsLoading || calidadLoading
  };
}

// ============================================
// UTILIDADES EXPORTADAS
// ============================================

/**
 * Texto que se muestra cuando el teléfono está oculto
 */
export const MASKED_PHONE = PHONE_MASKED_TEXT;

/**
 * Etapas que siempre permiten ver el teléfono
 */
export const VISIBLE_PHONE_ETAPAS = ETAPAS_CON_VISIBILIDAD;

/**
 * Razón por la que el teléfono está oculto
 */
export const HIDDEN_PHONE_REASON = PHONE_HIDDEN_REASON;

// Re-export de tipos para compatibilidad con Vite
export type { ProspectoPhoneData, PhoneVisibilityResult };

export default usePhoneVisibility;

