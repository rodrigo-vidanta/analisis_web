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
   */
  async getNextOperativeEjecutivo(coordinacionId: string, excludeId?: string): Promise<string | null> {
    try {
      // Obtener ejecutivos operativos de la coordinación
      const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      
      // Filtrar solo los operativos y excluir el ejecutivo actual
      const ejecutivosOperativos = ejecutivos.filter(ejecutivo => 
        ejecutivo.is_active && 
        ejecutivo.is_operativo !== false &&
        ejecutivo.id !== excludeId
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
   * Excluye al ejecutivo actual y solo muestra operativos/activos
   * Si no hay ejecutivos disponibles, incluye coordinadores activos
   */
  async getAvailableBackups(
    coordinacionId: string,
    excludeEjecutivoId: string
  ): Promise<EjecutivoBackup[]> {
    try {
      // Obtener ejecutivos operativos de la coordinación
      const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);
      
      const ejecutivosDisponibles = ejecutivos
        .filter(ejecutivo => 
          ejecutivo.id !== excludeEjecutivoId &&
          ejecutivo.is_active &&
          ejecutivo.is_operativo !== false &&
          ejecutivo.phone && // Solo ejecutivos con teléfono
          ejecutivo.phone.trim() !== ''
        )
        .map(ejecutivo => ({
          id: ejecutivo.id,
          email: ejecutivo.email,
          full_name: ejecutivo.full_name,
          phone: ejecutivo.phone,
          is_operativo: ejecutivo.is_operativo !== false,
          is_coordinator: false
        }));

      // Obtener coordinadores activos de la coordinación (siempre como opción adicional)
      let coordinadoresDisponibles: EjecutivoBackup[] = [];
      try {
        const coordinadores = await coordinacionService.getCoordinadoresByCoordinacion(coordinacionId);
        
        coordinadoresDisponibles = coordinadores
          .filter(coord => 
            coord.id !== excludeEjecutivoId &&
            coord.is_active &&
            coord.phone && // Solo coordinadores con teléfono
            coord.phone.trim() !== ''
          )
          .map(coord => ({
            id: coord.id,
            email: coord.email,
            full_name: coord.full_name,
            phone: coord.phone,
            is_operativo: true, // Coordinadores siempre están operativos
            is_coordinator: true
          }));
      } catch (coordError) {
        console.error('Error obteniendo coordinadores para backup:', coordError);
        // Si falla obtener coordinadores, continuar sin ellos
      }

      // Si hay ejecutivos disponibles, retornarlos junto con coordinadores
      if (ejecutivosDisponibles.length > 0) {
        return [...ejecutivosDisponibles, ...coordinadoresDisponibles];
      }

      // Si no hay ejecutivos disponibles, retornar solo coordinadores
      return coordinadoresDisponibles;
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
}

export const backupService = new BackupService();

