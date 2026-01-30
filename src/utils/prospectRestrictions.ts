/**
 * ============================================
 * RESTRICCIONES TEMPORALES DE PROSPECTOS
 * ============================================
 * 
 * Helper centralizado para aplicar/liberar restricciones de UI
 * basadas en la etapa del prospecto.
 * 
 * FECHA: 29 de Enero 2026
 * ESTADO: Activo
 * 
 * RESTRICCIONES ACTUALES:
 * - Etapa "Importado Manual": Restricciones completas (ver abajo)
 * 
 * PARA LIBERAR/MODIFICAR:
 * 1. Cambiar RESTRICTED_STAGES o los getters específicos
 * 2. Los componentes se actualizarán automáticamente
 */

import { etapasService } from '../services/etapasService';
import type { Etapa } from '../types/etapas';

// ============================================
// CONFIGURACIÓN DE RESTRICCIONES
// ============================================

/**
 * Códigos de etapas con restricciones activas
 * 
 * Para LIBERAR restricciones: comentar o eliminar el código de la etapa
 * Para APLICAR a nueva etapa: agregar el código a este array
 * 
 * ⚠️ IMPORTANTE: Los códigos deben coincidir EXACTAMENTE con la tabla etapas (case-sensitive)
 */
const RESTRICTED_STAGES: string[] = [
  'importado_manual', // ✅ CORRECTO: minúsculas con guion bajo (código real en BD)
];

// ============================================
// HELPERS PRINCIPALES
// ============================================

/**
 * Verifica si un prospecto está en una etapa con restricciones
 * 
 * @param etapaId - UUID de la etapa (campo etapa_id)
 * @param etapaLegacy - Nombre legacy (campo etapa) - fallback si no hay etapa_id
 * @returns true si el prospecto está restringido
 */
export const isProspectRestricted = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): boolean => {
  // Si no hay restricciones configuradas, nadie está restringido
  if (RESTRICTED_STAGES.length === 0) return false;
  
  // Si no hay etapa, no está restringido
  if (!etapaId && !etapaLegacy) {
    return false;
  }

  // Verificar por etapa_id (preferido)
  if (etapaId) {
    const etapa = etapasService.getById(etapaId);
    
    // Si encontramos la etapa, verificar si está restringida
    if (etapa) {
      const isRestricted = RESTRICTED_STAGES.includes(etapa.codigo);
      
      // Debug logging (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('[prospectRestrictions] Verificando por etapa_id:', {
          etapaId,
          etapaCodigo: etapa.codigo,
          etapaNombre: etapa.nombre,
          isRestricted,
          restrictedStages: RESTRICTED_STAGES
        });
      }
      
      return isRestricted;
    }
    
    // Si no encontramos la etapa por ID, algo está mal (warning)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[prospectRestrictions] Etapa no encontrada por ID:', etapaId);
    }
  }

  // Fallback: verificar por nombre legacy (compatibilidad)
  if (etapaLegacy) {
    const etapa = etapasService.getByNombreLegacy(etapaLegacy);
    
    // Si encontramos la etapa, verificar si está restringida
    if (etapa) {
      const isRestricted = RESTRICTED_STAGES.includes(etapa.codigo);
      
      // Debug logging (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('[prospectRestrictions] Verificando por etapa legacy:', {
          etapaLegacy,
          etapaCodigo: etapa.codigo,
          etapaNombre: etapa.nombre,
          isRestricted,
          restrictedStages: RESTRICTED_STAGES
        });
      }
      
      return isRestricted;
    }
    
    // Si no encontramos por nombre legacy, buscar match directo con código
    // (caso edge: si alguien pone el código en el campo legacy)
    if (RESTRICTED_STAGES.includes(etapaLegacy.toLowerCase().replace(/\s+/g, '_'))) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[prospectRestrictions] Match directo con código:', etapaLegacy);
      }
      return true;
    }
    
    // Warning si no encontramos la etapa
    if (process.env.NODE_ENV === 'development') {
      console.warn('[prospectRestrictions] Etapa no encontrada por nombre:', etapaLegacy);
    }
  }

  // Por defecto, no restringir si no pudimos determinar la etapa
  return false;
};

// ============================================
// RESTRICCIONES ESPECÍFICAS POR ACCIÓN
// ============================================

/**
 * Verifica si se puede INICIAR LLAMADA para este prospecto
 * 
 * AFECTA:
 * - Módulo WhatsApp: botón de iniciar llamada
 * 
 * ROLES: Ejecutivos, Supervisores, Coordinadores
 */
export const canStartCall = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): boolean => {
  return !isProspectRestricted(etapaId, etapaLegacy);
};

/**
 * Verifica si se puede PAUSAR BOT para este prospecto
 * 
 * AFECTA:
 * - Módulo WhatsApp: botón de pausar bot
 * - Widget Últimas Conversaciones: botón de pausar bot
 * 
 * ROLES: Ejecutivos, Supervisores, Coordinadores
 */
export const canPauseBot = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): boolean => {
  return !isProspectRestricted(etapaId, etapaLegacy);
};

/**
 * Verifica si se puede ACTIVAR/DESACTIVAR "Requiere Atención Humana"
 * 
 * AFECTA:
 * - Módulo WhatsApp: botón de requiere atención
 * - Widget Últimas Conversaciones: botón de requiere atención
 * 
 * ROLES: Ejecutivos, Supervisores, Coordinadores
 */
export const canToggleAttentionRequired = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): boolean => {
  return !isProspectRestricted(etapaId, etapaLegacy);
};

/**
 * Verifica si se puede PROGRAMAR LLAMADA para este prospecto
 * 
 * AFECTA:
 * - Sidebar de Prospecto (todas las vistas):
 *   - Widget Últimas Conversaciones > header del nombre
 *   - Módulo WhatsApp > clic en nombre
 *   - Módulo Prospectos > clic en prospecto
 * 
 * ROLES: Ejecutivos, Supervisores, Coordinadores
 */
export const canScheduleCall = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): boolean => {
  return !isProspectRestricted(etapaId, etapaLegacy);
};

// ============================================
// HELPERS DE UI
// ============================================

/**
 * Obtiene un mensaje explicativo para mostrar cuando una acción está restringida
 * 
 * @param action - Tipo de acción restringida
 * @returns Mensaje para tooltip o toast
 */
export const getRestrictionMessage = (
  action: 'call' | 'pause' | 'attention' | 'schedule'
): string => {
  const messages = {
    call: 'No se puede iniciar llamadas con prospectos en etapa "Importado Manual"',
    pause: 'No se puede pausar el bot para prospectos en etapa "Importado Manual"',
    attention: 'No se puede modificar "Requiere Atención" para prospectos en etapa "Importado Manual"',
    schedule: 'No se puede programar llamadas con prospectos en etapa "Importado Manual"',
  };

  return messages[action];
};

/**
 * Obtiene el código de etapa actual (para debugging)
 */
export const getEtapaCodigo = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): string | null => {
  if (etapaId) {
    const etapa = etapasService.getById(etapaId);
    return etapa?.codigo || null;
  }

  if (etapaLegacy) {
    const etapa = etapasService.getByNombreLegacy(etapaLegacy);
    return etapa?.codigo || null;
  }

  return null;
};

// ============================================
// CONFIGURACIÓN PARA LIBERACIÓN RÁPIDA
// ============================================

/**
 * Para DESACTIVAR TODAS las restricciones temporalmente:
 * 
 * 1. Descomentar la línea de abajo:
 */
// export const RESTRICTIONS_DISABLED = true;

/**
 * 2. Modificar isProspectRestricted para retornar false:
 */
// export const isProspectRestricted = () => false;

/**
 * 3. O vaciar el array RESTRICTED_STAGES:
 */
// const RESTRICTED_STAGES: string[] = [];
