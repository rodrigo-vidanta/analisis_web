/**
 * ============================================
 * SERVICIO DE BACKUP PARA EJECUTIVOS
 * ============================================
 * 
 * Gestiona el sistema de backup cuando ejecutivos están fuera de oficina
 * - Asignación de backup al hacer logout
 * - Cambio de teléfono al teléfono del backup
 * - Restauración de teléfono original al hacer login
 * - Permisos de visualización para backups
 * 
 * ⚠️ ARQUITECTURA ACTUAL (Post-migración Supabase Auth Nativo):
 * - Datos de backup (backup_id, has_backup, telefono_original) están en auth.users.raw_user_meta_data (JSONB)
 * - LECTURA: Via vista user_profiles_v2 (VIEW sobre auth.users + auth_roles)
 * - ESCRITURA: Via authAdminProxyService → Edge Function auth-admin-proxy → updateUserMetadata
 * - auth_users legacy fue renombrada a z_legacy_auth_users (NO USAR)
 * 
 * REFACTOR 2026-01-22: Uso de authAdminProxyService centralizado
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { authAdminProxyService } from './authAdminProxyService';
import { coordinacionService } from './coordinacionService';
import { permissionsService } from './permissionsService';
import { formatExecutiveDisplayName } from '../utils/nameFormatter';

export interface BackupInfo {
  ejecutivo_id: string;
  backup_id: string;
  telefono_original: string;
  telefono_backup: string;
  has_backup: boolean;
}

export interface EjecutivoBackup {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_operativo?: boolean;
  is_coordinator?: boolean; // Indica si es coordinador
  is_supervisor?: boolean; // Indica si es supervisor
}

export interface AvailableBackupsResult {
  backups: EjecutivoBackup[];
  unavailableUsers: {
    id: string;
    full_name: string;
    reason: 'no_phone' | 'no_dynamics' | 'no_phone_and_dynamics';
  }[];
}

class BackupService {
  /**
   * ⚡ DEDUPLICACIÓN: Map de promises in-flight para evitar thundering herd
   * Cuando múltiples componentes piden los mismos datos simultáneamente,
   * solo se hace UNA request real y todas las demás esperan la misma promise.
   */
  private inflight = new Map<string, Promise<any>>();

  /**
   * Ejecuta una función async con deduplicación por clave.
   * Si ya hay una request in-flight para la misma clave, retorna la misma promise.
   */
  private async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;
    
    const promise = fn().finally(() => {
      this.inflight.delete(key);
    });
    
    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Asigna un backup a un ejecutivo
   * - Guarda el teléfono original
   * - Cambia el teléfono del ejecutivo al del backup
   * - Asigna el backup_id
   * 
   * Usa user_profiles_v2 (VIEW) para lectura y authAdminProxyService para escritura
   */
  async assignBackup(
    ejecutivoId: string,
    backupId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener teléfono del backup desde user_profiles_v2 (VIEW sobre auth.users)
      let telefonoBackup = '';
      const { data: backupData, error: backupError } = await supabaseSystemUI!
        .from('user_profiles_v2')
        .select('phone')
        .eq('id', backupId)
        .maybeSingle();

      if (backupError || !backupData) {
        return { success: false, error: 'Backup no encontrado' };
      }
      telefonoBackup = backupData.phone || '';

      // Obtener teléfono original del ejecutivo
      let telefonoOriginal = '';
      const { data: ejecutivoData } = await supabaseSystemUI!
        .from('user_profiles_v2')
        .select('phone, telefono_original')
        .eq('id', ejecutivoId)
        .maybeSingle();

      if (ejecutivoData) {
        telefonoOriginal = ejecutivoData.telefono_original || ejecutivoData.phone || '';
      }

      // Usar servicio centralizado para actualizar backup
      const success = await authAdminProxyService.updateUserMetadata(ejecutivoId, {
        backup_id: backupId,
        telefono_original: telefonoOriginal,
        phone: telefonoBackup,
        has_backup: true,
        updated_at: new Date().toISOString()
      });

      if (!success) {
        throw new Error('Error al asignar backup');
      }

      return { success: true };
    } catch (error) {
      console.error('Error en assignBackup:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Remueve el backup de un ejecutivo y restaura su teléfono original
   * Usa user_profiles_v2 (VIEW) para lectura y authAdminProxyService para escritura
   */
  async removeBackup(ejecutivoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener teléfono original desde user_profiles_v2 (VIEW sobre auth.users)
      let telefonoOriginal = '';
      const { data: ejecutivoData } = await supabaseSystemUI!
        .from('user_profiles_v2')
        .select('telefono_original')
        .eq('id', ejecutivoId)
        .maybeSingle();

      if (ejecutivoData) {
        telefonoOriginal = ejecutivoData.telefono_original || '';
      }

      // Usar servicio centralizado para remover backup
      const success = await authAdminProxyService.updateUserMetadata(ejecutivoId, {
        backup_id: null,
        phone: telefonoOriginal,
        telefono_original: null,
        has_backup: false,
        updated_at: new Date().toISOString()
      });

      if (!success) {
        throw new Error('Error al remover backup');
      }

      return { success: true };
    } catch (error) {
      console.error('Error en removeBackup:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Obtiene el siguiente ejecutivo operativo en una coordinación
   * Útil para asignación automática de backup
   * @deprecated Usar getAutomaticBackup en su lugar para seguir el orden de prioridad correcto
   */
  async getNextOperativeEjecutivo(coordinacionId: string, excludeId?: string): Promise<string | null> {
    try {
      // Obtener ejecutivos operativos de la coordinación
      const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      
      // Filtrar solo los operativos y excluir el ejecutivo actual
      const ejecutivosOperativos = ejecutivos.filter(ejecutivo => 
        ejecutivo.is_active && 
        ejecutivo.is_operativo !== false &&
        ejecutivo.id !== excludeId &&
        ejecutivo.phone && // Debe tener teléfono
        ejecutivo.phone.trim() !== ''
      );

      if (ejecutivosOperativos.length === 0) {
        return null;
      }

      // Ordenar por último login (más reciente primero) o por nombre si no hay login
      ejecutivosOperativos.sort((a, b) => {
        if (a.last_login && b.last_login) {
          return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
        }
        if (a.last_login) return -1;
        if (b.last_login) return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      return ejecutivosOperativos[0].id;
    } catch (error) {
      console.error('Error obteniendo siguiente ejecutivo operativo:', error);
      return null;
    }
  }

  /**
   * Obtiene el backup automático siguiendo el orden de prioridad:
   * 1. Ejecutivos operativos con teléfono de la misma coordinación
   * 2. Supervisores operativos con teléfono de la misma coordinación
   * 3. Coordinadores operativos con teléfono
   * 4. Supervisores con teléfono (aunque no estén operativos)
   * 5. Coordinadores con teléfono (aunque no estén operativos)
   * 
   * NOTA: Este orden coincide con getAvailableBackups() para mantener consistencia
   */
  async getAutomaticBackup(coordinacionId: string, excludeId?: string): Promise<string | null> {
    try {
      // Helper para ordenar por último login o nombre
      const sortByLoginOrName = (a: any, b: any) => {
        if (a.last_login && b.last_login) {
          return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
        }
        if (a.last_login) return -1;
        if (b.last_login) return 1;
        return a.full_name.localeCompare(b.full_name);
      };

      // PRIORIDAD 1: Ejecutivos operativos con teléfono
      try {
        const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
        const ejecutivosOperativos = ejecutivos.filter(ejecutivo => 
          ejecutivo.id !== excludeId &&
          ejecutivo.is_active &&
          ejecutivo.is_operativo !== false &&
          ejecutivo.phone &&
          ejecutivo.phone.trim() !== ''
        );

        if (ejecutivosOperativos.length > 0) {
          ejecutivosOperativos.sort(sortByLoginOrName);
          return ejecutivosOperativos[0].id;
        }
      } catch (ejecError) {
        console.error('Error obteniendo ejecutivos para backup automático:', ejecError);
      }

      // PRIORIDAD 2: Supervisores operativos con teléfono
      try {
        const supervisores = await coordinacionService.getSupervisoresByCoordinacion(coordinacionId);
        const supervisoresOperativos = supervisores.filter(sup => 
          sup.id !== excludeId &&
          sup.is_active &&
          sup.is_operativo !== false &&
          sup.phone &&
          sup.phone.trim() !== ''
        );

        if (supervisoresOperativos.length > 0) {
          supervisoresOperativos.sort(sortByLoginOrName);
          return supervisoresOperativos[0].id;
        }
      } catch (supError) {
        console.error('Error obteniendo supervisores para backup automático:', supError);
      }

      // PRIORIDAD 3: Coordinadores operativos con teléfono
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        const coordinadoresOperativos = coordinadores.filter(coord => 
          coord.id !== excludeId &&
          coord.is_active &&
          coord.is_operativo !== false &&
          coord.phone &&
          coord.phone.trim() !== ''
        );

        if (coordinadoresOperativos.length > 0) {
          coordinadoresOperativos.sort(sortByLoginOrName);
          return coordinadoresOperativos[0].id;
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores para backup automático:', coordError);
      }

      // PRIORIDAD 4: Supervisores con teléfono (aunque no estén operativos)
      try {
        const supervisores = await coordinacionService.getSupervisoresByCoordinacion(coordinacionId);
        const supervisoresConTelefono = supervisores.filter(sup => 
          sup.id !== excludeId &&
          sup.is_active &&
          sup.phone &&
          sup.phone.trim() !== ''
        );

        if (supervisoresConTelefono.length > 0) {
          supervisoresConTelefono.sort(sortByLoginOrName);
          return supervisoresConTelefono[0].id;
        }
      } catch (supError) {
        console.error('Error obteniendo supervisores (no operativos) para backup automático:', supError);
      }

      // PRIORIDAD 5: Coordinadores con teléfono (aunque no estén operativos)
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        const coordinadoresConTelefono = coordinadores.filter(coord => 
          coord.id !== excludeId &&
          coord.is_active &&
          coord.phone &&
          coord.phone.trim() !== ''
        );

        if (coordinadoresConTelefono.length > 0) {
          coordinadoresConTelefono.sort(sortByLoginOrName);
          return coordinadoresConTelefono[0].id;
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores (no operativos) para backup automático:', coordError);
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo backup automático:', error);
      return null;
    }
  }

  /**
   * Obtiene información del backup asignado a un ejecutivo
   * Usa 2 queries separadas (embedded resource no funciona en VIEWs sin FK)
   */
  async getBackupInfo(ejecutivoId: string): Promise<BackupInfo | null> {
    try {
      // Query 1: datos del ejecutivo
      const { data: ejecutivoData, error: ejecutivoError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, backup_id, telefono_original, phone, has_backup')
        .eq('id', ejecutivoId)
        .single();

      if (ejecutivoError || !ejecutivoData) {
        return null;
      }

      // Si no tiene backup asignado, retornar sin buscar backup
      let telefonoBackup = '';
      if (ejecutivoData.backup_id && ejecutivoData.has_backup) {
        // Query 2: datos del backup
        const { data: backupData } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('phone')
          .eq('id', ejecutivoData.backup_id)
          .maybeSingle();

        telefonoBackup = backupData?.phone || '';
      }

      return {
        ejecutivo_id: ejecutivoData.id,
        backup_id: ejecutivoData.backup_id || '',
        telefono_original: ejecutivoData.telefono_original || '',
        telefono_backup: telefonoBackup,
        has_backup: ejecutivoData.has_backup || false
      };
    } catch (error) {
      console.error('Error obteniendo información de backup:', error);
      return null;
    }
  }

  /**
   * Obtiene ejecutivos, supervisores y coordinadores disponibles para backup en una coordinación
   * Orden de prioridad:
   * 1. Ejecutivos operativos con teléfono (de la misma coordinación)
   * 2. Supervisores operativos con teléfono (de la misma coordinación)
   * 3. Coordinadores operativos con teléfono
   * 4. Supervisores con teléfono (aunque no estén operativos)
   * 5. Coordinadores con teléfono (aunque no estén operativos)
   * 6. Coordinadores sin teléfono (última opción)
   * 
   * También retorna información sobre usuarios activos que no cumplen requisitos
   * para mostrar mensaje informativo
   */
  async getAvailableBackups(
    coordinacionId: string,
    excludeEjecutivoId: string
  ): Promise<EjecutivoBackup[]> {
    const result = await this.getAvailableBackupsWithDetails(coordinacionId, excludeEjecutivoId);
    return result.backups;
  }

  /**
   * Versión extendida que también retorna usuarios no disponibles con razón
   */
  async getAvailableBackupsWithDetails(
    coordinacionId: string,
    excludeEjecutivoId: string
  ): Promise<AvailableBackupsResult> {
    try {
      const unavailableUsers: AvailableBackupsResult['unavailableUsers'] = [];
      
      // Obtener ejecutivos de la coordinación
      const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      
      // Filtrar solo ejecutivos activos y operativos (excluir el que hace logout)
      // getEjecutivosByCoordinacion retorna ejecutivos, coordinadores y supervisores
      const ejecutivosActivosOperativos = ejecutivos.filter(ejecutivo =>
        ejecutivo.id !== excludeEjecutivoId &&
        ejecutivo.is_active &&
        ejecutivo.is_operativo !== false &&
        ejecutivo.role_name === 'ejecutivo'
      );

      // PRIORIDAD 1: Ejecutivos operativos con teléfono
      const ejecutivosConTelefono = ejecutivosActivosOperativos
        .filter(ejecutivo => {
          const hasPhone = ejecutivo.phone && ejecutivo.phone.trim() !== '';

          if (!hasPhone) {
            // Registrar como no disponible
            unavailableUsers.push({
              id: ejecutivo.id,
              full_name: ejecutivo.full_name,
              reason: 'no_phone'
            });
            return false;
          }

          return true;
        })
        .map(ejecutivo => ({
          id: ejecutivo.id,
          email: ejecutivo.email,
          full_name: ejecutivo.full_name,
          phone: ejecutivo.phone!,
          is_operativo: true,
          is_coordinator: false,
          is_supervisor: false
        }));

      // Si hay ejecutivos válidos, retornarlos junto con los no disponibles
      if (ejecutivosConTelefono.length > 0) {
        return { backups: ejecutivosConTelefono, unavailableUsers };
      }

      // PRIORIDAD 2: Supervisores operativos con teléfono
      try {
        const supervisores = await coordinacionService.getSupervisoresByCoordinacion(coordinacionId);
        
        const supervisoresOperativosConTelefono = supervisores
          .filter(sup => {
            if (sup.id === excludeEjecutivoId) return false;
            if (!sup.is_active) return false;
            if (sup.is_operativo === false) return false;
            
            const hasPhone = sup.phone && sup.phone.trim() !== '';
            return hasPhone;
          })
          .map(sup => ({
            id: sup.id,
            email: sup.email,
            full_name: sup.full_name,
            phone: sup.phone!,
            is_operativo: true,
            is_coordinator: false,
            is_supervisor: true
          }));

        if (supervisoresOperativosConTelefono.length > 0) {
          return { backups: supervisoresOperativosConTelefono, unavailableUsers };
        }
      } catch (supError) {
        console.error('Error obteniendo supervisores para backup:', supError);
      }

      // PRIORIDAD 3: Coordinadores operativos con teléfono
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        
        const coordinadoresOperativosConTelefono = coordinadores
          .filter(coord => {
            if (coord.id === excludeEjecutivoId) return false;
            if (!coord.is_active) return false;
            if (coord.is_operativo === false) return false;
            
            const hasPhone = coord.phone && coord.phone.trim() !== '';
            return hasPhone;
          })
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone!,
            is_operativo: true,
            is_coordinator: true,
            is_supervisor: false
          }));

        if (coordinadoresOperativosConTelefono.length > 0) {
          return { backups: coordinadoresOperativosConTelefono, unavailableUsers };
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores para backup:', coordError);
      }

      // PRIORIDAD 4: Supervisores con teléfono (no necesariamente operativos)
      try {
        const supervisores = await coordinacionService.getSupervisoresByCoordinacion(coordinacionId);
        
        const supervisoresConTelefono = supervisores
          .filter(sup => {
            if (sup.id === excludeEjecutivoId) return false;
            if (!sup.is_active) return false;
            
            const hasPhone = sup.phone && sup.phone.trim() !== '';
            return hasPhone;
          })
          .map(sup => ({
            id: sup.id,
            email: sup.email,
            full_name: sup.full_name,
            phone: sup.phone!,
            is_operativo: sup.is_operativo !== false,
            is_coordinator: false,
            is_supervisor: true
          }));

        if (supervisoresConTelefono.length > 0) {
          return { backups: supervisoresConTelefono, unavailableUsers };
        }
      } catch (supError) {
        console.error('Error obteniendo supervisores (no operativos) para backup:', supError);
      }

      // PRIORIDAD 5: Coordinadores con teléfono (no necesariamente operativos)
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        
        const coordinadoresConTelefono = coordinadores
          .filter(coord => {
            if (coord.id === excludeEjecutivoId) return false;
            if (!coord.is_active) return false;
            
            const hasPhone = coord.phone && coord.phone.trim() !== '';
            return hasPhone;
          })
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone!,
            is_operativo: coord.is_operativo !== false,
            is_coordinator: true,
            is_supervisor: false
          }));

        if (coordinadoresConTelefono.length > 0) {
          return { backups: coordinadoresConTelefono, unavailableUsers };
        }

        // PRIORIDAD 6: Coordinadores sin teléfono (última opción, solo para emergencias)
        const coordinadoresSinTelefono = coordinadores
          .filter(coord => {
            if (coord.id === excludeEjecutivoId) return false;
            if (!coord.is_active) return false;
            return true;
          })
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone || '',
            is_operativo: coord.is_operativo !== false,
            is_coordinator: true,
            is_supervisor: false
          }));

        if (coordinadoresSinTelefono.length > 0) {
          return { backups: coordinadoresSinTelefono, unavailableUsers };
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores para backup:', coordError);
      }

      return { backups: [], unavailableUsers };
    } catch (error) {
      console.error('Error obteniendo backups disponibles:', error);
      return { backups: [], unavailableUsers: [] };
    }
  }

  /**
   * Verifica si un ejecutivo tiene backup asignado
   * ⚡ DEDUPLICACIÓN: Evita thundering herd
   */
  async hasBackup(ejecutivoId: string): Promise<boolean> {
    return this.dedupe(`has_backup_${ejecutivoId}`, async () => {
      try {
        // Verificar caché primero
        const cached = permissionsService.backupCache.get(ejecutivoId);
        const now = Date.now();
        const CACHE_TTL = 30 * 1000;
        
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
          return cached.data?.has_backup || false;
        }

        const { data, error } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('has_backup')
          .eq('id', ejecutivoId)
          .single();

        if (error || !data) {
          return false;
        }

        return data.has_backup || false;
      } catch (error) {
        console.error('Error verificando backup:', error);
        return false;
      }
    });
  }

  /**
   * Obtiene información del ejecutivo del cual el usuario actual es backup
   * Retorna null si el usuario no es backup de nadie
   * ⚡ OPTIMIZACIÓN: Usa caché de permissionsService + deduplicación de promises in-flight
   * para evitar thundering herd (2146+ requests simultáneas al buscar en WhatsApp)
   */
  async getBackupEjecutivoInfo(currentUserId: string): Promise<{
    ejecutivo_id: string;
    ejecutivo_nombre: string;
    ejecutivo_email: string;
  } | null> {
    // ⚡ DEDUPLICACIÓN: Si ya hay una request in-flight para este userId, reusar la misma promise
    return this.dedupe(`backup_info_${currentUserId}`, () => this._getBackupEjecutivoInfoImpl(currentUserId));
  }

  /**
   * Implementación interna de getBackupEjecutivoInfo (sin deduplicación)
   * Busca: ¿Qué ejecutivo me tiene a MÍ como su backup?
   */
  private async _getBackupEjecutivoInfoImpl(currentUserId: string): Promise<{
    ejecutivo_id: string;
    ejecutivo_nombre: string;
    ejecutivo_email: string;
  } | null> {
    try {
      // Buscar ejecutivo que tiene a currentUserId como backup
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, full_name, email')
        .eq('backup_id', currentUserId)
        .eq('has_backup', true)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        ejecutivo_id: data.id,
        ejecutivo_nombre: formatExecutiveDisplayName(data.full_name) || data.email,
        ejecutivo_email: data.email
      };
    } catch (error) {
      console.error('Error obteniendo información de backup:', error);
      return null;
    }
  }

  /**
   * Verifica si un prospecto pertenece a un ejecutivo del cual el usuario actual es backup
   */
  async isProspectFromBackupEjecutivo(
    currentUserId: string,
    prospectoEjecutivoId: string | null | undefined
  ): Promise<{
    isBackup: boolean;
    ejecutivo_nombre?: string;
    ejecutivo_email?: string;
  }> {
    if (!prospectoEjecutivoId) {
      return { isBackup: false };
    }

    try {
      const backupInfo = await this.getBackupEjecutivoInfo(currentUserId);
      
      if (!backupInfo) {
        return { isBackup: false };
      }

      // Verificar si el prospecto pertenece al ejecutivo del cual es backup
      if (backupInfo.ejecutivo_id === prospectoEjecutivoId) {
        return {
          isBackup: true,
          ejecutivo_nombre: backupInfo.ejecutivo_nombre,
          ejecutivo_email: backupInfo.ejecutivo_email
        };
      }

      return { isBackup: false };
    } catch (error) {
      console.error('Error verificando si prospecto es de backup:', error);
      return { isBackup: false };
    }
  }
}

export const backupService = new BackupService();

