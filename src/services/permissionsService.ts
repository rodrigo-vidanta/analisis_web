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
 * 
 * MEJORA 2026-01-20: Verificación de conexión antes de queries
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { isNetworkOnline } from '../hooks/useNetworkStatus';

// ============================================
// CONSTANTES
// ============================================

/**
 * FLAG DE DEBUG - Cambiar a true para ver logs de permisos
 */
const DEBUG_PERMISSIONS = false;

/**
 * Código de la coordinación de Calidad
 * Los coordinadores de esta coordinación tienen acceso completo a todos los prospectos
 * de todas las coordinaciones (igual que los administradores)
 */
const COORDINACION_CALIDAD_CODIGO = 'CALIDAD';

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

// Interface para cache con TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PermissionsService {
  
  // ============================================
  // SISTEMA DE CACHÉ
  // ============================================
  
  // TTL del caché en milisegundos (30 segundos)
  private readonly CACHE_TTL = 30 * 1000;
  
  // Caché para verificación de backups (evitar loop infinito de consultas)
  // Hacer público para que otros servicios puedan acceder
  public backupCache = new Map<string, { data: { backup_id: string | null; has_backup: boolean } | null; timestamp: number }>();
  
  // Caché para ejecutivos donde un usuario es backup (diferente estructura)
  private backupOfCache = new Map<string, CacheEntry<string[]>>();
  
  // Cachés para diferentes datos
  private permissionsCache = new Map<string, CacheEntry<UserPermissions | null>>();
  private coordinacionesCache = new Map<string, CacheEntry<string[] | null>>();
  private ejecutivoCache = new Map<string, CacheEntry<string | null>>();
  private calidadCache = new Map<string, CacheEntry<boolean>>();
  private accessProspectCache = new Map<string, CacheEntry<PermissionCheck>>();
  
  // Flag para prevenir múltiples cargas batch simultáneas
  private isLoadingBackupBatch = false;
  
  // ============================================
  // DEDUPLICACIÓN DE REQUESTS IN-FLIGHT
  // ============================================
  // Previene que múltiples llamadas simultáneas a getUserPermissions 
  // disparen requests HTTP duplicados antes de que el cache se llene.
  // Cuando una request está en vuelo, las llamadas subsecuentes 
  // reciben la misma Promise en lugar de disparar una nueva.
  private inflightPermissions = new Map<string, Promise<UserPermissions | null>>();
  private inflightCalidad = new Map<string, Promise<boolean>>();
  
  /**
   * Verifica si una entrada de caché es válida (no ha expirado)
   */
  private isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }
  
  /**
   * Limpia cachés expirados periódicamente
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.permissionsCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.permissionsCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.coordinacionesCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.coordinacionesCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.ejecutivoCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.ejecutivoCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.calidadCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.calidadCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.accessProspectCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.accessProspectCache.delete(key);
      }
    }
  }
  
  /**
   * Invalida todo el caché de un usuario específico
   */
  invalidateUserCache(userId: string): void {
    this.permissionsCache.delete(userId);
    this.coordinacionesCache.delete(userId);
    this.ejecutivoCache.delete(userId);
    this.calidadCache.delete(userId);
    
    // Limpiar caché de acceso a prospectos para este usuario
    for (const key of this.accessProspectCache.keys()) {
      if (key.startsWith(userId + ':')) {
        this.accessProspectCache.delete(key);
      }
    }
  }
  
  /**
   * Invalida todo el caché
   */
  invalidateAllCache(): void {
    this.permissionsCache.clear();
    this.coordinacionesCache.clear();
    this.ejecutivoCache.clear();
    this.calidadCache.clear();
    this.accessProspectCache.clear();
    // Limpiar cachés de backup
    this.backupCache.clear();
    this.backupOfCache.clear();
    // Limpiar también las promises in-flight
    this.inflightPermissions.clear();
    this.inflightCalidad.clear();
  }
  
  // ============================================
  // OBTENER PERMISOS DEL USUARIO
  // ============================================

  /**
   * Obtiene todos los permisos de un usuario según su rol y coordinación
   * Utiliza caché para evitar llamadas repetidas a la base de datos
   */
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    // Verificar caché primero
    const cached = this.permissionsCache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }
    
    // MEJORA 2026-01-20: Verificar conexión antes de consultar
    if (!isNetworkOnline()) {
      // Retornar caché si existe (aunque esté expirado) o null
      return cached?.data ?? null;
    }
    
    // MEJORA 2026-02-06: Deduplicación de requests in-flight
    // Si ya hay una request en vuelo para este userId, reutilizar esa Promise
    const inflight = this.inflightPermissions.get(userId);
    if (inflight) {
      return inflight;
    }
    
    // Crear nueva request y registrarla como in-flight
    const request = this._fetchUserPermissions(userId);
    this.inflightPermissions.set(userId, request);
    
    try {
      return await request;
    } finally {
      // Limpiar la referencia in-flight al completar (éxito o error)
      this.inflightPermissions.delete(userId);
    }
  }
  
  /**
   * Ejecuta la request real de permisos (separada para deduplicación)
   */
  private async _fetchUserPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('get_user_permissions', {
        p_user_id: userId,
      });

      if (error) {
        // Solo loguear si hay conexión (evitar spam cuando no hay internet)
        if (isNetworkOnline()) {
          console.error(`❌ [getUserPermissions] Error RPC para usuario ${userId}:`, error);
        }
        throw error;
      }
      
      // Guardar en caché
      const result = data as UserPermissions;
      this.permissionsCache.set(userId, { data: result, timestamp: Date.now() });
      
      // Limpiar cachés expirados cada cierto tiempo
      if (Math.random() < 0.1) this.cleanExpiredCache();
      
      return result;
    } catch (error) {
      // Solo loguear si hay conexión
      if (isNetworkOnline()) {
        console.error('Error obteniendo permisos del usuario:', error);
      }
      return null;
    }
  }

  // ============================================
  // VERIFICAR ACCESO A PROSPECTO
  // ============================================

  /**
   * Verifica si un usuario puede acceder a un prospecto específico
   * Verifica tanto en prospect_assignments como directamente en prospectos
   * Nota: Coordinadores de Calidad tienen acceso a todos los prospectos
   * Utiliza caché para evitar llamadas repetidas
   */
  async canUserAccessProspect(
    userId: string,
    prospectId: string
  ): Promise<PermissionCheck> {
    // Verificar caché primero
    const cacheKey = `${userId}:${prospectId}`;
    const cached = this.accessProspectCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }
    
    try {
      // Verificar primero si es coordinador de Calidad (tiene acceso completo)
      const isCalidad = await this.isCoordinadorCalidad(userId);
      if (isCalidad) {
        const result = {
          canAccess: true,
          reason: 'Coordinador de Calidad - acceso completo',
        };
        this.accessProspectCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

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
          // Obtener datos del prospecto para verificar si tiene ejecutivo_id asignado
          const { analysisSupabase } = await import('../config/analysisSupabase');
          const { data: prospectoData, error: prospectoError } = await analysisSupabase
            .from('prospectos')
            .select('ejecutivo_id, coordinacion_id')
            .eq('id', prospectId)
            .maybeSingle();
          
          // Si el prospecto no tiene ejecutivo_id asignado, denegar acceso inmediatamente
          if (!prospectoData || !prospectoData.ejecutivo_id) {
            return {
              canAccess: false,
              reason: 'El prospecto no tiene una asignación activa en prospect_assignments y no tiene ejecutivo asignado',
            };
          }
          
          // Si tiene ejecutivo_id, verificar si coincide con el usuario actual
          const permissions = await this.getUserPermissions(userId);
          if (permissions && permissions.role === 'ejecutivo') {
            const userEjecutivoId = await this.getEjecutivoFilter(userId);
            const userCoordinaciones = await this.getCoordinacionesFilter(userId);
            
            // Comparar IDs como strings para evitar problemas de tipo
            const prospectEjecutivoIdStr = String(prospectoData.ejecutivo_id).trim();
            const userEjecutivoIdStr = userEjecutivoId ? String(userEjecutivoId).trim() : null;
            
            // Si el ejecutivo_id coincide, permitir acceso (sin verificar coordinación)
            // Esto es necesario después del refactor a auth.users donde algunos usuarios
            // pueden tener coordinacion_id null temporalmente
            if (userEjecutivoIdStr && prospectEjecutivoIdStr === userEjecutivoIdStr) {
              return {
                canAccess: true,
                reason: 'El prospecto está asignado a ti en la tabla prospectos',
              };
            }
          }
          // Si no coincide o no es ejecutivo, continuar con el fallback para verificar si es backup
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

      // Supervisor: puede ver todos los prospectos de sus coordinaciones (igual que coordinador)
      // Nota: Supervisores NO pueden reasignar prospectos (eso se controla en el módulo de prospectos)
      if (permissions.role === 'supervisor') {
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
          return {
            canAccess: false,
            reason: 'El prospecto no tiene ejecutivo asignado',
          };
        }
        
        const sameCoordinacion = userCoordinaciones ? userCoordinaciones.includes(prospectCoordinacionId) : false;
        const sameEjecutivo = userEjecutivoId === prospectEjecutivoId;
        
        // Verificar acceso directo:
        // 1. Si es el mismo ejecutivo asignado, permitir acceso (sin importar coordinación)
        // 2. Si NO es el mismo ejecutivo, verificar que estén en la misma coordinación
        if (sameEjecutivo) {
          return {
            canAccess: true,
            reason: undefined,
          };
        }
        
        // Si no es el mismo ejecutivo, verificar coordinación para backups
        if (sameCoordinacion) {
          // Verificar si es backup del ejecutivo asignado
          if (prospectEjecutivoId && userEjecutivoId) {
            // ⚡ OPTIMIZACIÓN CRÍTICA: Usar SOLO caché, NO hacer consultas individuales
            // Si los datos no están en caché, significa que no se pre-cargaron correctamente
            // En ese caso, denegar acceso en lugar de hacer una consulta individual que causa ERR_INSUFFICIENT_RESOURCES
            const cacheKey = prospectEjecutivoId;
            const cached = this.backupCache.get(cacheKey);
            const now = Date.now();
            
            let ejecutivoData: { backup_id: string | null; has_backup: boolean } | null = null;
            
            if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
              // Usar datos cacheados
              ejecutivoData = cached.data;
            } else {
              // ⚠️ NO hacer consulta individual - esto causa ERR_INSUFFICIENT_RESOURCES
              // Si no está en caché, significa que los datos no se pre-cargaron
              // En este caso, asumir que no es backup para evitar múltiples requests simultáneas
              console.warn(`⚠️ Datos de backup no encontrados en caché para ejecutivo ${prospectEjecutivoId}. Asegúrate de llamar preloadBackupData() antes de verificar permisos.`);
              ejecutivoData = null;
            }
            
            if (ejecutivoData) {
              if (ejecutivoData.backup_id === userEjecutivoId && ejecutivoData.has_backup === true) {
                // Verificar también que estén en la misma coordinación
                if (sameCoordinacion) {
                  return {
                    canAccess: true,
                    reason: 'Eres el backup del ejecutivo asignado',
                  };
                }
              }
            }
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
  // PRE-CARGAR DATOS DE BACKUP EN BATCH
  // ============================================
  
  /**
   * Pre-carga datos de backup para múltiples ejecutivos en una sola query
   * Esto evita múltiples requests simultáneas que causan ERR_INSUFFICIENT_RESOURCES
   */
  async preloadBackupData(ejecutivoIds: string[]): Promise<void> {
    if (!ejecutivoIds || ejecutivoIds.length === 0) return;
    
    // Filtrar IDs que ya están en caché y no han expirado
    const now = Date.now();
    const idsToLoad = ejecutivoIds.filter(id => {
      const cached = this.backupCache.get(id);
      return !cached || (now - cached.timestamp) >= this.CACHE_TTL;
    });
    
    if (idsToLoad.length === 0) return; // Todos ya están en caché
    
    // Prevenir múltiples cargas simultáneas
    if (this.isLoadingBackupBatch) {
      // Esperar a que termine la carga actual
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.preloadBackupData(idsToLoad); // Reintentar
    }
    
    this.isLoadingBackupBatch = true;
    
    try {
      // Cargar todos los datos de backup en una sola query
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, backup_id, has_backup')
        .in('id', idsToLoad);
      
      if (error) {
        console.error('❌ Error pre-cargando datos de backup:', error);
        return;
      }
      
      // Guardar en caché
      if (data) {
        data.forEach((ejecutivo: { id: string; backup_id: string | null; has_backup: boolean }) => {
          this.backupCache.set(ejecutivo.id, {
            data: {
              backup_id: ejecutivo.backup_id,
              has_backup: ejecutivo.has_backup
            },
            timestamp: now
          });
        });
      }
      
      // Para IDs que no se encontraron, guardar null en caché para evitar consultas repetidas
      const foundIds = new Set(data?.map((e: { id: string }) => e.id) || []);
      idsToLoad.forEach(id => {
        if (!foundIds.has(id)) {
          this.backupCache.set(id, {
            data: null,
            timestamp: now
          });
        }
      });
    } catch (error) {
      console.error('❌ Error en preloadBackupData:', error);
    } finally {
      this.isLoadingBackupBatch = false;
    }
  }

  // ============================================
  // OBTENER EJECUTIVOS DONDE ES BACKUP
  // ============================================
  
  /**
   * Obtiene los IDs de ejecutivos donde el usuario actual es backup
   * Usa caché para evitar múltiples consultas
   */
  async getEjecutivosWhereIsBackup(ejecutivoId: string): Promise<string[]> {
    const cacheKey = `backup_of_${ejecutivoId}`;
    const cached = this.backupOfCache.get(cacheKey);
    
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }
    
    try {
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id')
        .eq('backup_id', ejecutivoId)
        .eq('has_backup', true);
      
      if (error) {
        console.error('❌ Error obteniendo ejecutivos donde es backup:', error);
        return [];
      }
      
      const ejecutivosIds = data?.map(e => e.id) || [];
      
      // Guardar en caché
      this.backupOfCache.set(cacheKey, {
        data: ejecutivosIds,
        timestamp: Date.now()
      });
      
      return ejecutivosIds;
    } catch (error) {
      console.error('❌ Error en getEjecutivosWhereIsBackup:', error);
      return [];
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

      // Coordinadores de Calidad no tienen filtro (pueden ver todo)
      if (permissions.role === 'coordinador') {
        const isCalidad = await this.isCoordinadorCalidad(userId);
        if (isCalidad) return null;
      }

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
   * Coordinadores de Calidad retornan null (pueden ver todo)
   * Utiliza caché para evitar llamadas repetidas
   */
  /**
   * Contrato de retorno (FIX 2026-02-07 - fail-closed):
   * - null  → Usuario es admin verificado (ve todo, sin filtro)
   * - []    → Sin acceso (error, sin coordinaciones, rol desconocido)
   * - [...] → Filtrar por estas coordinaciones
   */
  async getCoordinacionesFilter(userId: string): Promise<string[] | null> {
    // Verificar caché primero
    const cached = this.coordinacionesCache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) {
        // FIX: Error al obtener permisos → sin acceso (antes retornaba null = admin)
        console.error(`[getCoordinacionesFilter] Sin permisos para ${userId} - denegando acceso`);
        this.coordinacionesCache.set(userId, { data: [], timestamp: Date.now() });
        return [];
      }

      // Admin y Administrador Operativo no tienen filtro (pueden ver todo)
      if (permissions.role === 'admin' || permissions.role === 'administrador_operativo') {
        this.coordinacionesCache.set(userId, { data: null, timestamp: Date.now() });
        return null;
      }

      // Ejecutivo: retornar su coordinación única
      if (permissions.role === 'ejecutivo') {
        // FIX: Ejecutivo sin coordinacion → sin acceso (antes retornaba null = admin)
        const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : [];
        this.coordinacionesCache.set(userId, { data: result, timestamp: Date.now() });
        return result;
      }

      // Coordinador y Supervisor: verificar si es de Calidad primero, luego obtener coordinaciones
      if (permissions.role === 'coordinador' || permissions.role === 'supervisor') {
        // Coordinadores de Calidad no tienen filtro (pueden ver todo)
        if (permissions.role === 'coordinador') {
          const isCalidad = await this.isCoordinadorCalidad(userId);
          if (isCalidad) {
            this.coordinacionesCache.set(userId, { data: null, timestamp: Date.now() });
            return null;
          }
        }

        // Coordinadores y Supervisores: obtener todas sus coordinaciones desde tabla intermedia
        // Migrado de coordinador_coordinaciones → auth_user_coordinaciones (2025-12-29)
        const { data, error } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .select('coordinacion_id')
          .eq('user_id', userId);

        if (error) {
          // 42501 = sesión expirada/logout en progreso → retornar vacío silenciosamente
          if (error.code !== '42501') {
            console.error(`Error obteniendo coordinaciones del ${permissions.role}:`, error);
          }
          // FIX: Error en query → usar fallback, pero si no hay fallback → sin acceso (antes retornaba null = admin)
          const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : [];
          this.coordinacionesCache.set(userId, { data: result, timestamp: Date.now() });
          return result;
        }

        if (data && data.length > 0) {
          const result = data.map(row => row.coordinacion_id);
          this.coordinacionesCache.set(userId, { data: result, timestamp: Date.now() });
          return result;
        }

        // FIX: Sin coordinaciones asignadas → sin acceso (antes retornaba null = admin)
        console.warn(`[getCoordinacionesFilter] ${permissions.role} ${userId} sin coordinaciones asignadas`);
        this.coordinacionesCache.set(userId, { data: [], timestamp: Date.now() });
        return [];
      }

      // FIX: Roles no contemplados (evaluador, developer, direccion, productor) → sin acceso (antes retornaba null = admin)
      console.warn(`[getCoordinacionesFilter] Rol no contemplado: ${permissions.role} para ${userId}`);
      this.coordinacionesCache.set(userId, { data: [], timestamp: Date.now() });
      return [];
    } catch (error) {
      // FIX: Error general → sin acceso (antes retornaba null = admin)
      console.error('Error obteniendo filtro de coordinaciones:', error);
      return [];
    }
  }

  /**
   * Obtiene el filtro de ejecutivo para un usuario
   * Retorna el user_id si es ejecutivo, null si es coordinador, supervisor o admin
   * Nota: Supervisores NO tienen filtro de ejecutivo - pueden ver todos los prospectos de su coordinación
   * Utiliza caché para evitar llamadas repetidas
   */
  async getEjecutivoFilter(userId: string): Promise<string | null> {
    // Verificar caché primero
    const cached = this.ejecutivoCache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }
    
    try {
      const permissions = await this.getUserPermissions(userId);
      
      if (!permissions) {
        this.ejecutivoCache.set(userId, { data: null, timestamp: Date.now() });
        return null;
      }

      // Solo ejecutivos tienen filtro por ejecutivo
      // Supervisores NO tienen filtro de ejecutivo (ven todos los prospectos de su coordinación)
      if (permissions.role === 'ejecutivo') {
        this.ejecutivoCache.set(userId, { data: userId, timestamp: Date.now() });
        return userId;
      }

      this.ejecutivoCache.set(userId, { data: null, timestamp: Date.now() });
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

  /**
   * Verifica si un usuario es coordinador de la coordinación de Calidad
   * Los coordinadores de Calidad tienen acceso completo a todos los prospectos
   * de todas las coordinaciones (igual que los administradores)
   * Utiliza caché para evitar llamadas repetidas
   */
  async isCoordinadorCalidad(userId: string): Promise<boolean> {
    // Verificar caché primero
    const cached = this.calidadCache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }
    
    // MEJORA 2026-02-06: Deduplicación de requests in-flight
    const inflight = this.inflightCalidad.get(userId);
    if (inflight) {
      return inflight;
    }
    
    const request = this._fetchIsCoordinadorCalidad(userId);
    this.inflightCalidad.set(userId, request);
    
    try {
      return await request;
    } finally {
      this.inflightCalidad.delete(userId);
    }
  }
  
  /**
   * Ejecuta la verificación real de coordinador de calidad (separada para deduplicación)
   */
  private async _fetchIsCoordinadorCalidad(userId: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) {
        this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
        return false;
      }

      // Solo aplica a coordinadores
      if (permissions.role !== 'coordinador') {
        this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
        return false;
      }

      // Obtener todas las coordinaciones del coordinador
      // Migrado de coordinador_coordinaciones → auth_user_coordinaciones (2025-12-29)
      const { data: relaciones, error: relError } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .select('coordinacion_id')
        .eq('user_id', userId);

      if (relError || !relaciones || relaciones.length === 0) {
        this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
        return false;
      }

      // Obtener códigos de coordinaciones por separado (sin embed)
      const coordIds = relaciones.map(r => r.coordinacion_id);
      const { data: coordinaciones, error: coordError } = await supabaseSystemUI
        .from('coordinaciones')
        .select('codigo')
        .in('id', coordIds);

      if (coordError || !coordinaciones) {
        this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
        return false;
      }

      // Verificar si alguna de sus coordinaciones es CALIDAD
      const isCalidad = coordinaciones.some((coord: any) => 
        coord.codigo?.toUpperCase() === COORDINACION_CALIDAD_CODIGO
      );

      // Guardar en caché
      this.calidadCache.set(userId, { data: isCalidad, timestamp: Date.now() });

      return isCalidad;
    } catch (error) {
      console.error('Error verificando coordinador de calidad:', error);
      return false;
    }
  }

  // ============================================
  // FILTROS PARA QUERIES SUPABASE
  // ============================================

  /**
   * Aplica filtros de permisos a una query de prospectos
   * Nota: Coordinadores de Calidad no tienen filtros (pueden ver todo)
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

      // Verificar primero si es coordinador de Calidad (tiene acceso completo)
      const isCalidad = await this.isCoordinadorCalidad(userId);
      if (isCalidad) {
        return query; // Retornar query sin modificar (acceso completo)
      }

      // Obtener los permisos del usuario para determinar el rol
      const permissions = await this.getUserPermissions(userId);
      const isAdmin = permissions?.role === 'admin' || permissions?.role === 'administrador_operativo';
      
      // Admin y Administrador Operativo no tienen filtros
      if (isAdmin) {
        return query;
      }

      const ejecutivoFilter = await this.getEjecutivoFilter(userId);
      // Usar getCoordinacionesFilter para obtener TODAS las coordinaciones del coordinador
      const coordinacionesFilter = await this.getCoordinacionesFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id + prospectos de ejecutivos donde es backup
      // CRÍTICO: También debe filtrar por coordinación para asegurar que solo vea prospectos de su coordinación
      if (ejecutivoFilter) {
        // Reutilizar coordinacionesFilter ya obtenido (antes se llamaba getCoordinacionesFilter de nuevo)
        const ejecutivoCoordinaciones = coordinacionesFilter;
        
        if (!ejecutivoCoordinaciones || ejecutivoCoordinaciones.length === 0) {
          // Ejecutivo sin coordinación asignada, no puede ver nada
          console.warn(`⚠️ [applyProspectFilters] Ejecutivo ${userId} sin coordinaciones asignadas - aplicando filtro restrictivo`);
          query = query.eq('coordinacion_id', '00000000-0000-0000-0000-000000000000');
          return query;
        }
        
        // Obtener IDs de ejecutivos donde este ejecutivo (ejecutivoFilter) es el backup
        // Buscar ejecutivos que tienen backup_id = ejecutivoFilter
        const { data: ejecutivosConBackup, error } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('id')
          .eq('backup_id', ejecutivoFilter)
          .eq('has_backup', true);
        
        const ejecutivosIds = [ejecutivoFilter]; // Sus propios prospectos
        if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
          ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
        }
        
        // CRÍTICO: Aplicar AMBOS filtros:
        // 1. Solo prospectos con ejecutivo_id asignado (no null) que coincida con él o sus backups
        // 2. Solo prospectos de su coordinación (o coordinaciones si tiene múltiples)
        query = query
          .in('ejecutivo_id', ejecutivosIds)
          .in('coordinacion_id', ejecutivoCoordinaciones);
      }
      // Si es coordinador o supervisor (no de Calidad), filtrar por coordinaciones
      else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
        query = query.in('coordinacion_id', coordinacionesFilter);
      }
      // Si no tiene ejecutivo ni coordinaciones, no debería ver nada (query vacía)
      else if (permissions?.role === 'coordinador' || permissions?.role === 'supervisor' || permissions?.role === 'ejecutivo') {
        console.warn(`⚠️ [applyProspectFilters] Usuario ${userId} (${permissions?.role}) sin coordinaciones asignadas - aplicando filtro restrictivo`);
        // Aplicar filtro que no retornará resultados
        query = query.eq('coordinacion_id', '00000000-0000-0000-0000-000000000000');
      }
      // Admin, Administrador Operativo y Coordinadores de Calidad no tienen filtros (pueden ver todo)
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
   * Nota: Coordinadores de Calidad no tienen filtros (pueden ver todo)
   */
  async applyCallFilters(
    query: any,
    userId: string
  ): Promise<any> {
    try {
      // Verificar primero si es coordinador de Calidad (tiene acceso completo)
      const isCalidad = await this.isCoordinadorCalidad(userId);
      if (isCalidad) {
        return { tipo: 'admin' }; // Tratar como admin (sin filtros)
      }

      // Obtener permisos del usuario para verificar rol
      const permissions = await this.getUserPermissions(userId);
      const isAdmin = permissions?.role === 'admin' || permissions?.role === 'administrador_operativo';
      
      if (isAdmin) {
        return { tipo: 'admin' };
      }

      const coordinacionesFilter = await this.getCoordinacionesFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id del prospecto + prospectos de ejecutivos donde es backup
      if (ejecutivoFilter) {
        // Obtener IDs de ejecutivos donde este ejecutivo (ejecutivoFilter) es el backup
        const { data: ejecutivosConBackup, error } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('id')
          .eq('backup_id', ejecutivoFilter)
          .eq('has_backup', true);
        
        if (error) {
          console.error('❌ Error obteniendo ejecutivos donde es backup:', error);
        }
        
        const ejecutivosIds = [ejecutivoFilter]; // Sus propias llamadas
        if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
          ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
        }
        
        // Nota: Este método retorna los IDs para filtrar después, ya que las llamadas no tienen ejecutivo_id directo
        // El filtrado real se hace en los servicios que llaman a este método
        return { ejecutivosIds, tipo: 'ejecutivo' };
      }
      // Si es coordinador o supervisor (no de Calidad), filtrar por coordinacion_id del prospecto
      else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
        return { coordinacionesIds: coordinacionesFilter, tipo: 'coordinador' };
      }
      // Si es coordinador o supervisor sin coordinaciones, no debería ver nada
      else if (permissions?.role === 'coordinador' || permissions?.role === 'supervisor') {
        console.warn(`⚠️ [applyCallFilters] ${permissions?.role} ${userId} sin coordinaciones asignadas`);
        return { coordinacionesIds: [], tipo: 'coordinador' };
      }
      // Admin, Administrador Operativo y Coordinadores de Calidad no tienen filtros
      return { tipo: 'admin' };
    } catch (error) {
      console.error('Error aplicando filtros de llamadas:', error);
      return { tipo: 'error' };
    }
  }

  /**
   * Aplica filtros de permisos a una query de conversaciones
   * Nota: Coordinadores de Calidad no tienen filtros (pueden ver todo)
   */
  async applyConversationFilters(
    query: any,
    userId: string
  ): Promise<any> {
    try {
      // Verificar primero si es coordinador de Calidad (tiene acceso completo)
      const isCalidad = await this.isCoordinadorCalidad(userId);
      if (isCalidad) {
        return query; // Retornar query sin modificar (acceso completo)
      }

      // Obtener permisos del usuario para verificar rol
      const permissions = await this.getUserPermissions(userId);
      const isAdmin = permissions?.role === 'admin' || permissions?.role === 'administrador_operativo';
      
      if (isAdmin) {
        return query;
      }

      const coordinacionesFilter = await this.getCoordinacionesFilter(userId);
      const ejecutivoFilter = await this.getEjecutivoFilter(userId);

      // Si es ejecutivo, filtrar por ejecutivo_id + prospectos de ejecutivos donde es backup
      if (ejecutivoFilter) {
        // Obtener IDs de ejecutivos donde este ejecutivo (ejecutivoFilter) es el backup
        // Buscar ejecutivos que tienen backup_id = ejecutivoFilter
        const { data: ejecutivosConBackup, error } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('id')
          .eq('backup_id', ejecutivoFilter)
          .eq('has_backup', true);
        
        if (error) {
          console.error('Error obteniendo ejecutivos donde es backup:', error);
        }
        
        const ejecutivosIds = [ejecutivoFilter]; // Sus propios prospectos
        if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
          ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
        }
        
        query = query.in('ejecutivo_id', ejecutivosIds);
      }
      // Si es coordinador o supervisor (no de Calidad), filtrar por coordinacion_id
      else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
        query = query.in('coordinacion_id', coordinacionesFilter);
      }
      // Si es coordinador o supervisor sin coordinaciones, aplicar filtro restrictivo
      else if (permissions?.role === 'coordinador' || permissions?.role === 'supervisor') {
        console.warn(`⚠️ [applyConversationFilters] ${permissions?.role} ${userId} sin coordinaciones asignadas - aplicando filtro restrictivo`);
        query = query.eq('coordinacion_id', '00000000-0000-0000-0000-000000000000');
      }
      // Admin, Administrador Operativo y Coordinadores de Calidad no tienen filtros (pueden ver todo)

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

