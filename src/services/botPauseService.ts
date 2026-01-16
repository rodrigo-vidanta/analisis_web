/**
 * ============================================
 * SERVICIO DE GESTIÓN DE PAUSA DEL BOT
 * ============================================
 * 
 * Maneja el estado de pausa del bot en la base de datos
 * para persistencia entre sesiones de usuarios
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-01-15):
 * - Usa cliente normal con anon_key (no service_role)
 * - RLS debe permitir operaciones de usuarios autenticados
 * - Si RLS bloquea, el bot sigue funcionando (degradación graceful)
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

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

    try {
      const now = new Date();
      let pausedUntil: Date | null = null;

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

      // Verificar si existe
      const { data: existing } = await this.client
        .from('bot_pause_status')
        .select('id')
        .eq('uchat_id', uchatId)
        .maybeSingle();

      if (existing) {
        // Actualizar
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

      // Crear nuevo
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
    if (!this.client) {
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

      // Verificar si la pausa ya expiró
      if (data.is_paused && data.paused_until) {
        const pausedUntil = new Date(data.paused_until);
        if (new Date() > pausedUntil) {
          await this.resumeBot(uchatId);
          return null;
        }
      }

      return data as BotPauseStatus;
    } catch (error) {
      console.warn('⚠️ BotPauseService getPauseStatus error:', error);
      return null;
    }
  }

  /**
   * Obtener todos los estados de pausa activos
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
   * Reactivar el bot (eliminar estado de pausa)
   */
  async resumeBot(uchatId: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const { error } = await this.client
        .from('bot_pause_status')
        .delete()
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
}

export const botPauseService = new BotPauseService();
export default botPauseService;
