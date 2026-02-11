/**
 * ============================================
 * SERVICIO DE GESTIÓN DE PAUSA DEL BOT
 * ============================================
 *
 * Maneja el estado de pausa del bot en la base de datos.
 * BD es la ÚNICA fuente de verdad (no localStorage).
 *
 * VALIDACIÓN: Solo acepta uchat_id con formato f{digits}u{digits}
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

const UCHAT_ID_REGEX = /^f\d+u\d+$/;

export interface BotPauseStatus {
  id?: string;
  uchat_id: string;
  is_paused: boolean;
  paused_until: string | null;
  paused_by: string;
  duration_minutes: number | null;
  paused_at: string;
  created_at?: string;
  updated_at?: string;
}

class BotPauseService {
  private client = supabaseSystemUI;

  /**
   * Validar que el uchat_id tiene el formato correcto
   */
  isValidUchatId(uchatId: string | null | undefined): boolean {
    if (!uchatId) return false;
    return UCHAT_ID_REGEX.test(uchatId);
  }

  /**
   * Guardar o actualizar el estado de pausa del bot
   */
  async savePauseStatus(
    uchatId: string,
    durationMinutes: number | null,
    pausedBy: string = 'agent'
  ): Promise<BotPauseStatus | null> {
    if (!this.client) {
      console.warn('⚠️ BotPauseService: Cliente no disponible');
      return null;
    }

    if (!this.isValidUchatId(uchatId)) {
      console.warn('⚠️ BotPauseService: uchat_id inválido, ignorando:', uchatId);
      return null;
    }

    try {
      const now = new Date();
      let pausedUntil: Date;

      if (durationMinutes === null) {
        pausedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        pausedUntil = new Date(now.getTime() + durationMinutes * 60 * 1000);
      }

      const pauseData = {
        uchat_id: uchatId,
        is_paused: true,
        paused_until: pausedUntil.toISOString(),
        paused_by: pausedBy,
        duration_minutes: durationMinutes,
        paused_at: now.toISOString()
      };

      // Verificar si ya existe registro para este uchat_id
      const { data: existing } = await this.client
        .from('bot_pause_status')
        .select('id')
        .eq('uchat_id', uchatId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await this.client
          .from('bot_pause_status')
          .update(pauseData)
          .eq('uchat_id', uchatId)
          .select()
          .single();

        if (error) {
          console.warn('⚠️ BotPauseService update error:', error.message);
          return null;
        }
        return data as BotPauseStatus;
      }

      const { data, error } = await this.client
        .from('bot_pause_status')
        .insert(pauseData)
        .select()
        .single();

      if (error) {
        console.warn('⚠️ BotPauseService insert error:', error.message);
        return null;
      }
      return data as BotPauseStatus;
    } catch (error) {
      console.warn('⚠️ BotPauseService savePauseStatus error:', error);
      return null;
    }
  }

  /**
   * Obtener el estado de pausa del bot
   */
  async getPauseStatus(uchatId: string): Promise<BotPauseStatus | null> {
    if (!this.client || !this.isValidUchatId(uchatId)) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('bot_pause_status')
        .select('*')
        .eq('uchat_id', uchatId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      // Si expiró o no está pausado, retornar null
      if (!data.is_paused) return null;
      if (data.paused_until && new Date() > new Date(data.paused_until)) return null;

      return data as BotPauseStatus;
    } catch (error) {
      console.warn('⚠️ BotPauseService getPauseStatus error:', error);
      return null;
    }
  }

  /**
   * Obtener todos los estados de pausa activos (no expirados)
   */
  async getAllActivePauses(): Promise<BotPauseStatus[]> {
    if (!this.client) {
      return [];
    }

    try {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('bot_pause_status')
        .select('*')
        .eq('is_paused', true)
        .gt('paused_until', now);

      if (error) {
        return [];
      }
      return (data || []) as BotPauseStatus[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Reactivar el bot (marcar como no pausado, conservar registro para auditoría)
   */
  async resumeBot(uchatId: string): Promise<boolean> {
    if (!this.client || !this.isValidUchatId(uchatId)) {
      return false;
    }

    try {
      const { error } = await this.client
        .from('bot_pause_status')
        .update({
          is_paused: false,
          paused_until: new Date().toISOString()
        })
        .eq('uchat_id', uchatId);

      if (error) {
        console.warn('⚠️ BotPauseService resumeBot error:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('⚠️ BotPauseService resumeBot error:', error);
      return false;
    }
  }

  /**
   * Calcular tiempo restante de pausa en segundos
   */
  getTimeRemaining(pauseStatus: BotPauseStatus | null): number {
    if (!pauseStatus || !pauseStatus.is_paused || !pauseStatus.paused_until) {
      return 0;
    }

    const pausedUntil = new Date(pauseStatus.paused_until);
    const now = new Date();
    return Math.max(0, Math.floor((pausedUntil.getTime() - now.getTime()) / 1000));
  }

  /**
   * Limpiar registros expirados de la BD (mantenimiento)
   */
  async cleanupExpired(): Promise<number> {
    if (!this.client) return 0;

    try {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('bot_pause_status')
        .delete()
        .eq('is_paused', true)
        .lt('paused_until', now)
        .select('id');

      if (error) {
        console.warn('⚠️ BotPauseService cleanup error:', error.message);
        return 0;
      }
      return data?.length || 0;
    } catch (error) {
      return 0;
    }
  }
}

export const botPauseService = new BotPauseService();
export default botPauseService;
