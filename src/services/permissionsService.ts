/**
 * ============================================
 * SERVICIO DE PERMISOS Y ACCESO
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este servicio verifica permisos según rol y coordinación del usuario
 * 2. Usa funciones RPC de System_UI para validar acceso
 * 3. Filtra datos según permisos del usuario
 * 4. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface UserPermissions {
  user_id: string;
  role: string;
  coordinacion_id?: string;
  permissions: Array<{
    module: string;
    permission_type: string;
    is_granted: boolean;
  }>;
}

export interface PermissionCheck {
  canAccess: boolean;
  reason?: string;
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class PermissionsService {
  
  // ============================================
  // OBTENER PERMISOS DEL USUARIO
  // ============================================

  /**
   * Obtiene todos los permisos de un usuario según su rol y coordinación
   */
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('get_user_permissions', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as UserPermissions;
    } catch (error) {
      console.error('Error obteniendo permisos del usuario:', error);
      return null;
    }
  }

  // ============================================
  // VERIFICAR ACCESO A PROSPECTO
  // ============================================

  /**
   * Verifica si un usuario puede acceder a un prospecto específico
   * Verifica tanto en prospect_assignments como directamente en prospectos
   */
  async canUserAccessProspect(
    userId: string,
    prospectId: string
  ): Promise<PermissionCheck> {
    try {
      // Primero intentar con la función RPC (busca en prospect_assignments)
      try {
        const { data, error } = await supabaseSystemUI.rpc('can_user_access_prospect', {
          p_user_id: userId,
          p_prospect_id: prospectId,
        });

        if (!error && data === true) {
          return {
            canAccess: true,
            reason: undefined,
          };
        }
      } catch (rpcError) {
        // Si la función RPC falla o retorna false, verificar directamente en prospectos
        console.warn('RPC can_user_access_prospect falló o retornó false, verificando directamente en prospectos:', rpcError);
      }

      // Fallback: Verificar directamente en la tabla prospectos
      // Obtener permisos del usuario
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) {
        return {
          canAccess: false,
          reason: 'No se pudieron obtener los permisos del usuario',
        };
      }

      // Admin puede ver todo
      if (permissions.role === 'admin') {
        return {
          canAccess: true,
          reason: undefined,
        };
      }

      // Obtener coordinaciones del usuario (puede tener múltiples si es coordinador)
      const userCoordinaciones = await this.getCoordinacionesFilter(userId);
      const userEjecutivoId = await this.getEjecutivoFilter(userId);

      // Obtener datos del prospecto directamente desde la tabla prospectos
      const { analysisSupabase } = await import('../config/analysisSupabase');
      const { data: prospectoData, error: prospectoError } = await analysisSupabase
        .from('prospectos')
        .select('coordinacion_id, ejecutivo_id')
        .eq('id', prospectId)
        .maybeSingle();

      if (prospectoError || !prospectoData) {
        return {
          canAccess: false,
          reason: 'No se pudo obtener la información del prospecto',
        };
      }

      const prospectCoordinacionId = prospectoData.coordinacion_id;
      const prospectEjecutivoId = prospectoData.ejecutivo_id;

      // Si el prospecto no tiene coordinación asignada, solo admin puede verlo
      if (!prospectCoordinacionId) {
        const canAccess = permissions.role === 'admin';
        return {
          canAccess,
          reason: canAccess ? undefined : 'El prospecto no tiene coordinación asignada',
        };
      }

      // Coordinador: puede ver si el prospecto está en alguna de sus coordinaciones
      if (permissions.role === 'coordinador') {
        if (userCoordinaciones && userCoordinaciones.length > 0) {
          const canAccess = userCoordinaciones.includes(prospectCoordinacionId);
          return {
            canAccess,
            reason: canAccess ? undefined : 'El prospecto no está asignado a ninguna de tus coordinaciones',
          };
        }
        // Fallback: usar coordinacion_id del permiso si no hay múltiples coordinaciones
        const canAccess = permissions.coordinacion_id === prospectCoordinacionId;
        return {
          canAccess,
          reason: canAccess ? undefined : 'El prospecto no está asignado a tu coordinación',
        };
      }

      // Ejecutivo: solo puede ver si el prospecto está asignado a él y a su coordinación
      if (permissions.role === 'ejecutivo') {
        const sameCoordinacion = userCoordinaciones ? userCoordinaciones.includes(prospectCoordinacionId) : false;
        const sameEjecutivo = userEjecutivoId === prospectEjecutivoId;
        const canAccess = sameCoordinacion && sameEjecutivo;
        return {
          canAccess,
          reason: canAccess ? undefined : 'El prospecto no está asignado a ti',
        };
      }

      return {
        canAccess: false,
        reason: 'No tienes permiso para acceder a este prospecto',
      };
    } catch (error) {
      console.error('Error verificando acceso a prospecto:', error);
      return {
        canAccess: false,
        reason: 'Error al verificar permisos',
      };
    }
  }

  // ============================================
  // VERIFICAR PERMISOS POR MÓDULO
  // ============================================

  /**
   * Verifica si un usuario tiene permiso para un módulo específico
   */
  async hasModulePermission(
    userId: string,
    module: 'prospectos' | 'livechat' | 'livemonitor',
    permissionType: 'view' | 'create' | 'update' | 'delete' | 'assign' = 'view'
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) return false;

      // Admin tiene acceso completo
      if (permissions.role === 'admin') return true;

      // Buscar permiso específico
      const hasPermission = permissions.permissions.some(
        (p) =>
          p.module === module &&
          p.permission_type === permissionType &&
          p.is_granted === true
      );

      return hasPermission;
    } catch (error) {
      console.error('Error verificando permiso de módulo:', error);
      return false;
    }
  }

  // ============================================
  // FILTROS PARA CONSULTAS
  // ============================================

  /**
   * Obtiene el filtro de coordinación para un usuario
   * Retorna el coordinacion_id si es ejecutivo o coordinador
   * @deprecated Usar getCoordinacionesFilter para coordinadores con múltiples coordinaciones
   */
  async getCoordinacionFilter(userId: string): Promise<string | null> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) return null;

      // Admin no tiene filtro
      if (permissions.role === 'admin') return null;

      // Coordinador y ejecutivo tienen filtro por coordinación
      return permissions.coordinacion_id || null;
    } catch (error) {
      console.error('Error obteniendo filtro de coordinación:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las coordinaciones de un coordinador
   * Retorna un array de coordinacion_id si es coordinador, null si es admin, o array con una coordinación si es ejecutivo
   */
  async getCoordinacionesFilter(userId: string): Promise<string[] | null> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) return null;

      // Admin no tiene filtro
      if (permissions.role === 'admin') return null;

      // Ejecutivo: retornar su coordinación única
      if (permissions.role === 'ejecutivo') {
        return permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
      }

      // Coordinador: obtener todas sus coordinaciones desde tabla intermedia
      if (permissions.role === 'coordinador') {
        const { data, error } = await supabaseSystemUIAdmin
          .from('coordinador_coordinaciones')
          .select('coordinacion_id')
          .eq('coordinador_id', userId);

        if (error) {
          console.error('Error obteniendo coordinaciones del coordinador:', error);
          // Fallback: usar coordinacion_id del permiso si existe
          return permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
        }

        if (data && data.length > 0) {
          return data.map(row => row.coordinacion_id);
        }

        // Si no tiene coordinaciones asignadas, retornar null (no debería ver nada)
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo filtro de coordinaciones:', error);
      return null;
    }
  }

  /**
   * Obtiene el filtro de ejecutivo para un usuario
   * Retorna el user_id si es ejecutivo, null si es coordinador o admin
   */
  async getEjecutivoFilter(userId: string): Promise<string | null> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) return null;

      // Solo ejecutivos tienen filtro por ejecutivo
      if (permissions.role === 'ejecutivo') {
        return userId;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo filtro de ejecutivo:', error);
      return null;
    }
  }

  // ============================================
  // VERIFICAR ROL DEL USUARIO
  // ============================================

  /**
   * Verifica si un usuario tiene un rol específico
   */
  async hasRole(userId: string, role: 'admin' | 'coordinador' | 'ejecutivo'): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) return false;

      return permissions.role === role;
    } catch (error) {
      console.error('Error verificando rol:', error);
      return false;
    }
  }

  /**
   * Verifica si un usuario es coordinador
   */
  async isCoordinador(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'coordinador');
  }

  /**
   * Verifica si un usuario es ejecutivo
   */
  async isEjecutivo(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'ejecutivo');
  }

  /**
   * Verifica si un usuario es admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  // ============================================
  // FILTROS PARA QUERIES SUPABASE
  // ============================================

  /**
   * Aplica filtros de permisos a una query de prospectos
   */
  async applyProspectFilters(
    query: any,
    userId: string
  ): Promise<any> {
    try {
      const coordinacionFilter = await this.getCoordinacionFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id
      if (ejecutivoFilter) {
        query = query.eq('ejecutivo_id', ejecutivoFilter);
      }
      // Si es coordinador, filtrar por coordinacion_id
      else if (coordinacionFilter) {
        query = query.eq('coordinacion_id', coordinacionFilter);
      }
      // Admin no tiene filtros

      return query;
    } catch (error) {
      console.error('Error aplicando filtros de prospectos:', error);
      return query;
    }
  }

  /**
   * Aplica filtros de permisos a una query de llamadas
   */
  async applyCallFilters(
    query: any,
    userId: string
  ): Promise<any> {
    try {
      const coordinacionFilter = await this.getCoordinacionFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id del prospecto
      if (ejecutivoFilter) {
        // Necesitamos hacer join con prospectos o filtrar después
        // Por ahora, retornamos query sin modificar
        // Esto se manejará en el servicio específico
      }
      // Si es coordinador, filtrar por coordinacion_id del prospecto
      else if (coordinacionFilter) {
        // Similar al caso anterior
      }

      return query;
    } catch (error) {
      console.error('Error aplicando filtros de llamadas:', error);
      return query;
    }
  }

  /**
   * Aplica filtros de permisos a una query de conversaciones
   */
  async applyConversationFilters(
    query: any,
    userId: string
  ): Promise<any> {
    try {
      const coordinacionFilter = await this.getCoordinacionFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id
      if (ejecutivoFilter) {
        query = query.eq('ejecutivo_id', ejecutivoFilter);
      }
      // Si es coordinador, filtrar por coordinacion_id
      else if (coordinacionFilter) {
        query = query.eq('coordinacion_id', coordinacionFilter);
      }
      // Admin no tiene filtros

      return query;
    } catch (error) {
      console.error('Error aplicando filtros de conversaciones:', error);
      return query;
    }
  }
}

// Exportar instancia singleton
export const permissionsService = new PermissionsService();
export default permissionsService;

