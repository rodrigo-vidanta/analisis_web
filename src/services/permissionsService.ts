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
      // Primero intentar con la función RPC (busca en prospect_assignments de system_ui)
      // Esta es la fuente de verdad para las asignaciones
      try {
        const { data, error } = await supabaseSystemUI.rpc('can_user_access_prospect', {
          p_user_id: userId,
          p_prospect_id: prospectId,
        });

        // Si la función RPC retorna true, el usuario tiene acceso
        if (!error && data === true) {
          return {
            canAccess: true,
            reason: undefined,
          };
        }
        
        // Si la función RPC retorna false (sin error), verificar si el prospecto tiene ejecutivo_id asignado
        // Si el ejecutivo_id coincide con el usuario actual, permitir acceso (asignado en prospectos aunque no en prospect_assignments)
        // Si no coincide, continuar con el fallback para verificar si es backup
        if (!error && data === false) {
          console.log(`⚠️ [canUserAccessProspect] RPC retornó false: Verificando asignación en prospectos para prospecto ${prospectId}`);
          
          // Obtener datos del prospecto para verificar si tiene ejecutivo_id asignado
          const { analysisSupabase } = await import('../config/analysisSupabase');
          const { data: prospectoData, error: prospectoError } = await analysisSupabase
            .from('prospectos')
            .select('ejecutivo_id, coordinacion_id')
            .eq('id', prospectId)
            .maybeSingle();
          
          // Si el prospecto no tiene ejecutivo_id asignado, denegar acceso inmediatamente
          if (!prospectoData || !prospectoData.ejecutivo_id) {
            console.log(`🚫 [canUserAccessProspect] RPC retornó false Y prospecto ${prospectId} no tiene ejecutivo_id asignado, denegando acceso`);
            return {
              canAccess: false,
              reason: 'El prospecto no tiene una asignación activa en prospect_assignments y no tiene ejecutivo asignado',
            };
          }
          
          // Si tiene ejecutivo_id, verificar si coincide con el usuario actual
          // Obtener permisos del usuario para verificar su ejecutivo_id
          const permissions = await this.getUserPermissions(userId);
          if (permissions && permissions.role === 'ejecutivo') {
            const userEjecutivoId = await this.getEjecutivoFilter(userId);
            const userCoordinaciones = await this.getCoordinacionesFilter(userId);
            
            // Comparar IDs como strings para evitar problemas de tipo
            const prospectEjecutivoIdStr = String(prospectoData.ejecutivo_id).trim();
            const userEjecutivoIdStr = userEjecutivoId ? String(userEjecutivoId).trim() : null;
            
            // Si el ejecutivo_id coincide y están en la misma coordinación, permitir acceso
            if (userEjecutivoIdStr && prospectEjecutivoIdStr === userEjecutivoIdStr) {
              const sameCoordinacion = userCoordinaciones ? userCoordinaciones.includes(prospectoData.coordinacion_id) : false;
              
              if (sameCoordinacion) {
                console.log(`✅ [canUserAccessProspect] RPC retornó false pero prospecto tiene ejecutivo_id asignado que coincide con usuario ${userId}, permitiendo acceso`);
                return {
                  canAccess: true,
                  reason: 'El prospecto está asignado a ti en la tabla prospectos',
                };
              } else {
                console.log(`⚠️ [canUserAccessProspect] RPC retornó false, ejecutivo_id coincide pero coordinación no coincide, continuando con verificación de backup`);
              }
            } else {
              console.log(`⚠️ [canUserAccessProspect] RPC retornó false, ejecutivo_id no coincide (prospecto: ${prospectEjecutivoIdStr}, usuario: ${userEjecutivoIdStr}), verificando si usuario es backup`);
            }
          }
          
          // Si no coincide o no es ejecutivo, continuar con el fallback para verificar si es backup
          console.log(`⚠️ [canUserAccessProspect] RPC retornó false pero prospecto tiene ejecutivo_id ${prospectoData.ejecutivo_id}, continuando con fallback`);
        }
        
        // Si hay un error en la función RPC, hacer fallback a verificación directa
        if (error) {
          console.warn('RPC can_user_access_prospect falló con error, haciendo fallback a verificación directa en prospectos:', error);
        }
      } catch (rpcError) {
        // Si la función RPC falla completamente (excepción), hacer fallback
        console.warn('RPC can_user_access_prospect lanzó excepción, haciendo fallback a verificación directa en prospectos:', rpcError);
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

      // Admin y Administrador Operativo pueden ver todo
      if (permissions.role === 'admin' || permissions.role === 'administrador_operativo') {
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
      
      // IMPORTANTE: Si llegamos aquí desde el fallback y el prospecto no tiene ejecutivo_id asignado,
      // denegar acceso inmediatamente (ya verificamos esto arriba, pero por seguridad lo verificamos de nuevo)
      if (!prospectEjecutivoId && permissions.role === 'ejecutivo') {
        console.log(`🚫 [canUserAccessProspect] Ejecutivo ${userId}: Prospecto ${prospectId} sin ejecutivo_id asignado en fallback, denegando acceso`);
        return {
          canAccess: false,
          reason: 'El prospecto no tiene ejecutivo asignado',
        };
      }

      // Si el prospecto no tiene coordinación asignada, solo admin y administrador_operativo pueden verlo
      if (!prospectCoordinacionId) {
        const canAccess = permissions.role === 'admin' || permissions.role === 'administrador_operativo';
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
      // O si es backup del ejecutivo asignado
      // IMPORTANTE: Este es un fallback solo si la función RPC falló técnicamente
      // Si la función RPC retornó false (sin asignación activa), ya se denegó el acceso arriba
      if (permissions.role === 'ejecutivo') {
        // Verificación estricta: el prospecto DEBE tener ejecutivo_id asignado
        if (!prospectEjecutivoId) {
          console.log(`🚫 [canUserAccessProspect] Ejecutivo ${userId}: Prospecto ${prospectId} sin ejecutivo_id asignado, denegando acceso`);
          return {
            canAccess: false,
            reason: 'El prospecto no tiene ejecutivo asignado',
          };
        }
        
        const sameCoordinacion = userCoordinaciones ? userCoordinaciones.includes(prospectCoordinacionId) : false;
        const sameEjecutivo = userEjecutivoId === prospectEjecutivoId;
        
        // Verificar acceso directo: debe estar en la misma coordinación Y asignado al mismo ejecutivo
        if (sameCoordinacion && sameEjecutivo) {
          console.log(`✅ [canUserAccessProspect] Ejecutivo ${userId}: Prospecto ${prospectId} asignado correctamente (coordinación y ejecutivo coinciden)`);
          return {
            canAccess: true,
            reason: undefined,
          };
        }
        
        // Si no coincide coordinación o ejecutivo, denegar acceso
        if (!sameCoordinacion) {
          console.log(`🚫 [canUserAccessProspect] Ejecutivo ${userId}: Prospecto ${prospectId} no está en su coordinación (prospecto: ${prospectCoordinacionId}, usuario: ${userCoordinaciones})`);
        }
        if (!sameEjecutivo) {
          console.log(`🚫 [canUserAccessProspect] Ejecutivo ${userId}: Prospecto ${prospectId} no está asignado a él (prospecto: ${prospectEjecutivoId}, usuario: ${userEjecutivoId})`);
        }

        // Verificar si es backup del ejecutivo asignado
        // El prospecto está asignado a prospectEjecutivoId
        // Verificamos si prospectEjecutivoId tiene como backup a userEjecutivoId
        if (prospectEjecutivoId && userEjecutivoId) {
          console.log(`🔍 [canUserAccessProspect] Verificando backup: prospecto asignado a ${prospectEjecutivoId}, usuario actual ${userEjecutivoId}`);
          
          // Verificar directamente en la BD si el ejecutivo asignado tiene como backup al usuario actual
          const { data: ejecutivoData, error: backupError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .select('backup_id, has_backup')
            .eq('id', prospectEjecutivoId)
            .single();
          
          if (!backupError && ejecutivoData) {
            console.log(`📋 [canUserAccessProspect] Datos del ejecutivo asignado: backup_id=${ejecutivoData.backup_id}, has_backup=${ejecutivoData.has_backup}`);
            
            if (ejecutivoData.backup_id === userEjecutivoId && ejecutivoData.has_backup === true) {
              console.log(`✅ [canUserAccessProspect] Usuario ${userEjecutivoId} es backup del ejecutivo ${prospectEjecutivoId}, permitiendo acceso`);
              
              // Verificar también que estén en la misma coordinación
              if (sameCoordinacion) {
                return {
                  canAccess: true,
                  reason: 'Eres el backup del ejecutivo asignado',
                };
              } else {
                console.log(`🚫 [canUserAccessProspect] Usuario ${userEjecutivoId} es backup pero prospecto no está en su coordinación`);
              }
            } else {
              console.log(`❌ [canUserAccessProspect] Usuario ${userEjecutivoId} NO es backup del ejecutivo ${prospectEjecutivoId} (backup_id=${ejecutivoData.backup_id}, has_backup=${ejecutivoData.has_backup})`);
            }
          } else {
            console.error(`❌ [canUserAccessProspect] Error verificando backup en BD:`, backupError);
          }
        }

        return {
          canAccess: false,
          reason: 'El prospecto no está asignado a ti ni eres backup del ejecutivo asignado',
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

      // Admin y Administrador Operativo tienen acceso completo
      if (permissions.role === 'admin' || permissions.role === 'administrador_operativo') return true;

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

      // Admin y Administrador Operativo no tienen filtro (pueden ver todo)
      if (permissions.role === 'admin' || permissions.role === 'administrador_operativo') return null;

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
      // Verificar que la query original es válida
      if (!query || typeof query !== 'object') {
        console.error('❌ [applyProspectFilters] Query original inválida:', query);
        const { analysisSupabase } = await import('../config/analysisSupabase');
        return analysisSupabase.from('prospectos').select('*');
      }

      const coordinacionFilter = await this.getCoordinacionFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id + prospectos de ejecutivos donde es backup
      if (ejecutivoFilter) {
        // Obtener IDs de ejecutivos donde este ejecutivo (ejecutivoFilter) es el backup
        // Buscar ejecutivos que tienen backup_id = ejecutivoFilter
        const { data: ejecutivosConBackup, error } = await supabaseSystemUIAdmin
          .from('auth_users')
          .select('id')
          .eq('backup_id', ejecutivoFilter)
          .eq('has_backup', true);
        
        const ejecutivosIds = [ejecutivoFilter]; // Sus propios prospectos
        if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
          ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
        }
        
        // Aplicar filtro .in() - esto retorna una nueva query builder válida
        query = query.in('ejecutivo_id', ejecutivosIds);
      }
      // Si es coordinador, filtrar por coordinacion_id
      else if (coordinacionFilter) {
        query = query.eq('coordinacion_id', coordinacionFilter);
      }
      // Admin y Administrador Operativo no tienen filtros (pueden ver todo)
      // La query se retorna tal cual sin modificar

      // Verificar que la query sigue siendo válida antes de retornarla
      if (!query || typeof query !== 'object') {
        console.error('❌ [applyProspectFilters] Query inválida después de aplicar filtros:', query);
        const { analysisSupabase } = await import('../config/analysisSupabase');
        return analysisSupabase.from('prospectos').select('*');
      }

      return query;
    } catch (error) {
      console.error('Error aplicando filtros de prospectos:', error);
      // En caso de error, retornar query de fallback
      const { analysisSupabase } = await import('../config/analysisSupabase');
      return analysisSupabase.from('prospectos').select('*');
    }
  }

  /**
   * Aplica filtros de permisos a una query de llamadas
   * Incluye lógica de backup: ejecutivos pueden ver llamadas de ejecutivos donde son backup
   */
  async applyCallFilters(
    query: any,
    userId: string
  ): Promise<any> {
    try {
      const coordinacionFilter = await this.getCoordinacionFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id del prospecto + prospectos de ejecutivos donde es backup
      if (ejecutivoFilter) {
        console.log(`🔍 [applyCallFilters] Ejecutivo ${ejecutivoFilter} buscando backups para llamadas...`);
        
        // Obtener IDs de ejecutivos donde este ejecutivo (ejecutivoFilter) es el backup
        const { data: ejecutivosConBackup, error } = await supabaseSystemUIAdmin
          .from('auth_users')
          .select('id')
          .eq('backup_id', ejecutivoFilter)
          .eq('has_backup', true);
        
        if (error) {
          console.error('❌ Error obteniendo ejecutivos donde es backup:', error);
        }
        
        const ejecutivosIds = [ejecutivoFilter]; // Sus propias llamadas
        if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
          ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
          console.log(`✅ Ejecutivo ${ejecutivoFilter} puede ver llamadas de ${ejecutivosConBackup.length} ejecutivos como backup. IDs:`, ejecutivosIds);
        } else {
          console.log(`⚠️ Ejecutivo ${ejecutivoFilter} NO tiene ejecutivos donde es backup`);
        }
        
        // Nota: Este método retorna los IDs para filtrar después, ya que las llamadas no tienen ejecutivo_id directo
        // El filtrado real se hace en los servicios que llaman a este método
        return { ejecutivosIds, tipo: 'ejecutivo' };
      }
      // Si es coordinador, filtrar por coordinacion_id del prospecto
      else if (coordinacionFilter) {
        return { coordinacionesIds: coordinacionFilter, tipo: 'coordinador' };
      }
      // Admin y Administrador Operativo no tienen filtros
      return { tipo: 'admin' };
    } catch (error) {
      console.error('Error aplicando filtros de llamadas:', error);
      return { tipo: 'error' };
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

      // Si es ejecutivo, filtrar por ejecutivo_id + prospectos de ejecutivos donde es backup
      if (ejecutivoFilter) {
        // Obtener IDs de ejecutivos donde este ejecutivo (ejecutivoFilter) es el backup
        // Buscar ejecutivos que tienen backup_id = ejecutivoFilter
        const { data: ejecutivosConBackup, error } = await supabaseSystemUIAdmin
          .from('auth_users')
          .select('id')
          .eq('backup_id', ejecutivoFilter)
          .eq('has_backup', true);
        
        if (error) {
          console.error('Error obteniendo ejecutivos donde es backup:', error);
        }
        
        const ejecutivosIds = [ejecutivoFilter]; // Sus propios prospectos
        if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
          ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
          console.log(`✅ Ejecutivo ${ejecutivoFilter} puede ver conversaciones de ${ejecutivosConBackup.length} ejecutivos como backup`);
        }
        
        query = query.in('ejecutivo_id', ejecutivosIds);
      }
      // Si es coordinador, filtrar por coordinacion_id
      else if (coordinacionFilter) {
        query = query.eq('coordinacion_id', coordinacionFilter);
      }
      // Admin y Administrador Operativo no tienen filtros (pueden ver todo)

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

