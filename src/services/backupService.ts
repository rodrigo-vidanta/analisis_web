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
 */

import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { coordinacionService } from './coordinacionService';

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
}

class BackupService {
  /**
   * Asigna un backup a un ejecutivo
   * - Guarda el teléfono original
   * - Cambia el teléfono del ejecutivo al del backup
   * - Asigna el backup_id
   */
  async assignBackup(
    ejecutivoId: string,
    backupId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener teléfono del backup
      const { data: backupData, error: backupError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('phone')
        .eq('id', backupId)
        .single();

      if (backupError || !backupData) {
        return { success: false, error: 'Backup no encontrado' };
      }

      const telefonoBackup = backupData.phone || '';

      // Obtener teléfono original del ejecutivo (si no existe, usar el actual)
      const { data: ejecutivoData, error: ejecutivoError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('phone, telefono_original')
        .eq('id', ejecutivoId)
        .single();

      if (ejecutivoError || !ejecutivoData) {
        return { success: false, error: 'Ejecutivo no encontrado' };
      }

      const telefonoOriginal = ejecutivoData.telefono_original || ejecutivoData.phone || '';

      // Actualizar ejecutivo con backup y cambio de teléfono
      const { error: updateError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .update({
          backup_id: backupId,
          telefono_original: telefonoOriginal, // Guardar teléfono original si no estaba guardado
          phone: telefonoBackup, // Cambiar al teléfono del backup
          has_backup: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', ejecutivoId);

      if (updateError) {
        console.error('Error asignando backup:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Backup asignado: Ejecutivo ${ejecutivoId} -> Backup ${backupId}`);
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
   */
  async removeBackup(ejecutivoId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener teléfono original
      const { data: ejecutivoData, error: ejecutivoError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('telefono_original')
        .eq('id', ejecutivoId)
        .single();

      if (ejecutivoError || !ejecutivoData) {
        return { success: false, error: 'Ejecutivo no encontrado' };
      }

      const telefonoOriginal = ejecutivoData.telefono_original || '';

      // Restaurar teléfono original y limpiar backup
      const { error: updateError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .update({
          backup_id: null,
          phone: telefonoOriginal, // Restaurar teléfono original
          telefono_original: null, // Limpiar teléfono original guardado
          has_backup: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', ejecutivoId);

      if (updateError) {
        console.error('Error removiendo backup:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Backup removido y teléfono restaurado para ejecutivo ${ejecutivoId}`);
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
   * 1. Primer coordinador activo con teléfono de la coordinación
   * 2. Si no hay coordinadores activos, primer ejecutivo activo con teléfono
   * 3. Si no hay ninguno activo, primer coordinador con teléfono (aunque no esté activo)
   */
  async getAutomaticBackup(coordinacionId: string, excludeId?: string): Promise<string | null> {
    try {
      // PRIORIDAD 1: Coordinadores activos con teléfono
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        const coordinadoresActivos = coordinadores.filter(coord => 
          coord.id !== excludeId &&
          coord.is_active &&
          coord.phone &&
          coord.phone.trim() !== ''
        );

        if (coordinadoresActivos.length > 0) {
          // Ordenar por último login o nombre
          coordinadoresActivos.sort((a, b) => {
            if (a.last_login && b.last_login) {
              return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
            }
            if (a.last_login) return -1;
            if (b.last_login) return 1;
            return a.full_name.localeCompare(b.full_name);
          });
          console.log('✅ Backup automático: Coordinador activo encontrado:', coordinadoresActivos[0].full_name);
          return coordinadoresActivos[0].id;
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores para backup automático:', coordError);
      }

      // PRIORIDAD 2: Ejecutivos activos con teléfono
      try {
        const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
        const ejecutivosActivos = ejecutivos.filter(ejecutivo => 
          ejecutivo.id !== excludeId &&
          ejecutivo.is_active &&
          ejecutivo.is_operativo !== false &&
          ejecutivo.phone &&
          ejecutivo.phone.trim() !== ''
        );

        if (ejecutivosActivos.length > 0) {
          // Ordenar por último login o nombre
          ejecutivosActivos.sort((a, b) => {
            if (a.last_login && b.last_login) {
              return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
            }
            if (a.last_login) return -1;
            if (b.last_login) return 1;
            return a.full_name.localeCompare(b.full_name);
          });
          console.log('✅ Backup automático: Ejecutivo activo encontrado:', ejecutivosActivos[0].full_name);
          return ejecutivosActivos[0].id;
        }
      } catch (ejecError) {
        console.error('Error obteniendo ejecutivos para backup automático:', ejecError);
      }

      // PRIORIDAD 3: Coordinadores con teléfono (aunque no estén activos)
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        const coordinadoresConTelefono = coordinadores.filter(coord => 
          coord.id !== excludeId &&
          coord.phone &&
          coord.phone.trim() !== ''
        );

        if (coordinadoresConTelefono.length > 0) {
          // Ordenar por último login o nombre
          coordinadoresConTelefono.sort((a, b) => {
            if (a.last_login && b.last_login) {
              return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
            }
            if (a.last_login) return -1;
            if (b.last_login) return 1;
            return a.full_name.localeCompare(b.full_name);
          });
          console.log('✅ Backup automático: Coordinador (no activo) encontrado:', coordinadoresConTelefono[0].full_name);
          return coordinadoresConTelefono[0].id;
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores (no activos) para backup automático:', coordError);
      }

      console.warn('⚠️ No se encontró ningún backup disponible siguiendo el orden de prioridad');
      return null;
    } catch (error) {
      console.error('Error obteniendo backup automático:', error);
      return null;
    }
  }

  /**
   * Obtiene información del backup asignado a un ejecutivo
   */
  async getBackupInfo(ejecutivoId: string): Promise<BackupInfo | null> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select(`
          id,
          backup_id,
          telefono_original,
          phone,
          has_backup,
          backup:backup_id (
            id,
            email,
            full_name,
            phone
          )
        `)
        .eq('id', ejecutivoId)
        .single();

      if (error || !data) {
        return null;
      }

      const backup = Array.isArray(data.backup) ? data.backup[0] : data.backup;

      return {
        ejecutivo_id: data.id,
        backup_id: data.backup_id || '',
        telefono_original: data.telefono_original || '',
        telefono_backup: backup?.phone || '',
        has_backup: data.has_backup || false
      };
    } catch (error) {
      console.error('Error obteniendo información de backup:', error);
      return null;
    }
  }

  /**
   * Obtiene ejecutivos y coordinadores disponibles para backup en una coordinación
   * Orden de prioridad:
   * 1. Ejecutivos operativos con teléfono e ID Dynamics
   * 2. Coordinadores operativos con teléfono e ID Dynamics
   * 3. Coordinadores con teléfono e ID Dynamics (no necesariamente operativos)
   * 4. Coordinadores no operativos (última opción, pueden o no tener teléfono/Dynamics)
   */
  async getAvailableBackups(
    coordinacionId: string,
    excludeEjecutivoId: string
  ): Promise<EjecutivoBackup[]> {
    try {
      // Obtener ejecutivos de la coordinación
      const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      console.log(`🔍 Analizando ${ejecutivos.length} ejecutivos para backup en coordinación ${coordinacionId}`);
      
      // PRIORIDAD 1: Ejecutivos operativos con teléfono e ID Dynamics
      const ejecutivosPrioridad1 = ejecutivos
        .filter(ejecutivo => {
          if (ejecutivo.id === excludeEjecutivoId) return false;
          if (!ejecutivo.is_active) return false;
          if (ejecutivo.is_operativo === false) return false; // Debe estar operativo
          
          const hasPhone = ejecutivo.phone && ejecutivo.phone.trim() !== '';
          const hasDynamics = ejecutivo.id_dynamics && ejecutivo.id_dynamics.trim() !== '';
          
          if (!hasPhone || !hasDynamics) {
            console.log(`⚠️ Ejecutivo ${ejecutivo.full_name} no cumple requisitos: teléfono=${hasPhone}, dynamics=${hasDynamics}`);
            return false;
          }
          
          console.log(`✅ Ejecutivo PRIORIDAD 1: ${ejecutivo.full_name} - Operativo, Teléfono, Dynamics`);
          return true;
        })
        .map(ejecutivo => ({
          id: ejecutivo.id,
          email: ejecutivo.email,
          full_name: ejecutivo.full_name,
          phone: ejecutivo.phone!,
          is_operativo: true,
          is_coordinator: false
        }));

      // Si hay ejecutivos de prioridad 1, retornarlos (no incluir coordinadores)
      if (ejecutivosPrioridad1.length > 0) {
        console.log(`✅ Retornando ${ejecutivosPrioridad1.length} ejecutivos (PRIORIDAD 1)`);
        return ejecutivosPrioridad1;
      }

      // PRIORIDAD 2-4: Coordinadores
      let coordinadoresDisponibles: EjecutivoBackup[] = [];
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        console.log(`🔍 Analizando ${coordinadores.length} coordinadores para backup`);
        
        // PRIORIDAD 2: Coordinadores operativos con teléfono e ID Dynamics
        const coordinadoresPrioridad2 = coordinadores
          .filter(coord => {
            if (coord.id === excludeEjecutivoId) return false;
            if (!coord.is_active) return false;
            if (coord.is_operativo === false) return false; // Debe estar operativo
            
            const hasPhone = coord.phone && coord.phone.trim() !== '';
            const hasDynamics = coord.id_dynamics && coord.id_dynamics.trim() !== '';
            
            if (!hasPhone || !hasDynamics) return false;
            
            console.log(`✅ Coordinador PRIORIDAD 2: ${coord.full_name} - Operativo, Teléfono, Dynamics`);
            return true;
          })
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone!,
            is_operativo: true,
            is_coordinator: true
          }));

        if (coordinadoresPrioridad2.length > 0) {
          console.log(`✅ Retornando ${coordinadoresPrioridad2.length} coordinadores (PRIORIDAD 2)`);
          return coordinadoresPrioridad2;
        }

        // PRIORIDAD 3: Coordinadores con teléfono e ID Dynamics (no necesariamente operativos)
        const coordinadoresPrioridad3 = coordinadores
          .filter(coord => {
            if (coord.id === excludeEjecutivoId) return false;
            if (!coord.is_active) return false;
            
            const hasPhone = coord.phone && coord.phone.trim() !== '';
            const hasDynamics = coord.id_dynamics && coord.id_dynamics.trim() !== '';
            
            if (!hasPhone || !hasDynamics) return false;
            
            console.log(`✅ Coordinador PRIORIDAD 3: ${coord.full_name} - Teléfono, Dynamics (operativo: ${coord.is_operativo})`);
            return true;
          })
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone!,
            is_operativo: coord.is_operativo !== false,
            is_coordinator: true
          }));

        if (coordinadoresPrioridad3.length > 0) {
          console.log(`✅ Retornando ${coordinadoresPrioridad3.length} coordinadores (PRIORIDAD 3)`);
          return coordinadoresPrioridad3;
        }

        // PRIORIDAD 4: Coordinadores no operativos (última opción, pueden o no tener teléfono/Dynamics)
        const coordinadoresPrioridad4 = coordinadores
          .filter(coord => {
            if (coord.id === excludeEjecutivoId) return false;
            if (!coord.is_active) return false;
            if (coord.is_operativo === true) return false; // Solo no operativos
            
            console.log(`✅ Coordinador PRIORIDAD 4: ${coord.full_name} - No operativo (última opción)`);
            return true;
          })
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone || '',
            is_operativo: false,
            is_coordinator: true
          }));

        if (coordinadoresPrioridad4.length > 0) {
          console.log(`⚠️ Retornando ${coordinadoresPrioridad4.length} coordinadores NO OPERATIVOS (PRIORIDAD 4 - última opción)`);
          return coordinadoresPrioridad4;
        }
      } catch (coordError) {
        console.error('Error obteniendo coordinadores para backup:', coordError);
      }

      console.log(`❌ No se encontraron backups disponibles siguiendo el orden de prioridad`);
      return [];
    } catch (error) {
      console.error('Error obteniendo backups disponibles:', error);
      return [];
    }
  }

  /**
   * Verifica si un ejecutivo tiene backup asignado
   */
  async hasBackup(ejecutivoId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_users')
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
  }

  /**
   * Obtiene información del ejecutivo del cual el usuario actual es backup
   * Retorna null si el usuario no es backup de nadie
   */
  async getBackupEjecutivoInfo(currentUserId: string): Promise<{
    ejecutivo_id: string;
    ejecutivo_nombre: string;
    ejecutivo_email: string;
  } | null> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('backup_id, has_backup')
        .eq('id', currentUserId)
        .single();

      if (error || !data || !data.backup_id || !data.has_backup) {
        return null;
      }

      // Obtener información del ejecutivo del cual es backup
      const { data: ejecutivoData, error: ejecutivoError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('id, full_name, email')
        .eq('id', data.backup_id)
        .single();

      if (ejecutivoError || !ejecutivoData) {
        return null;
      }

      return {
        ejecutivo_id: ejecutivoData.id,
        ejecutivo_nombre: ejecutivoData.full_name || ejecutivoData.email,
        ejecutivo_email: ejecutivoData.email
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

