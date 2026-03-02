/**
 * ============================================
 * SERVICIO DE GESTIÓN DE PAUSA DEL BOT
 * ============================================
 *
 * Maneja el estado de pausa del bot en la base de datos.
 * BD es la ÚNICA fuente de verdad (no localStorage).
 *
 * Soporta multiproveedor: uchat_id (uChat) y prospecto_id (Twilio)
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

const UCHAT_ID_REGEX = /^f\d+u\d+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BotPauseStatus {
  id?: string;
  uchat_id: string | null;
  prospecto_id?: string | null;
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
   * Validar que el uchat_id tiene el formato correcto (f{digits}u{digits})
   */
  isValidUchatId(uchatId: string | null | undefined): boolean {
    if (!uchatId) return false;
    return UCHAT_ID_REGEX.test(uchatId);
  }

  /**
   * Validar que el prospecto_id es un UUID válido
   */
  isValidProspectoId(prospectoId: string | null | undefined): boolean {
    if (!prospectoId) return false;
    return UUID_REGEX.test(prospectoId);
  }

  /**
   * Construir datos comunes de pausa
   */
  private buildPauseData(durationMinutes: number | null, pausedBy: string) {
    const now = new Date();
    const pausedUntil = durationMinutes === null
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + durationMinutes * 60 * 1000);

    return {
      is_paused: true,
      paused_until: pausedUntil.toISOString(),
      paused_by: pausedBy,
      duration_minutes: durationMinutes,
      paused_at: now.toISOString()
    };
  }

  // ============================================
  // MÉTODOS POR uchat_id (uChat - existentes)
  // ============================================

  /**
   * Guardar o actualizar el estado de pausa del bot por uchat_id
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
      const pauseData = {
        uchat_id: uchatId,
        ...this.buildPauseData(durationMinutes, pausedBy)
      };

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
   * Obtener el estado de pausa del bot por uchat_id
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

      if (!data.is_paused) return null;
      if (data.paused_until && new Date() > new Date(data.paused_until)) return null;

      return data as BotPauseStatus;
    } catch (error) {
      console.warn('⚠️ BotPauseService getPauseStatus error:', error);
      return null;
    }
  }

  /**
   * Reactivar el bot por uchat_id
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

  // ============================================
  // MÉTODOS POR prospecto_id (Twilio)
  // ============================================

  /**
   * Guardar o actualizar el estado de pausa del bot por prospecto_id
   */
  async savePauseByProspectoId(
    prospectoId: string,
    durationMinutes: number | null,
    pausedBy: string = 'agent'
  ): Promise<BotPauseStatus | null> {
    if (!this.client) {
      console.warn('⚠️ BotPauseService: Cliente no disponible');
      return null;
    }

    if (!this.isValidProspectoId(prospectoId)) {
      console.warn('⚠️ BotPauseService: prospecto_id inválido, ignorando:', prospectoId);
      return null;
    }

    try {
      const pauseData = {
        prospecto_id: prospectoId,
        ...this.buildPauseData(durationMinutes, pausedBy)
      };

      const { data: existing } = await this.client
        .from('bot_pause_status')
        .select('id')
        .eq('prospecto_id', prospectoId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await this.client
          .from('bot_pause_status')
          .update(pauseData)
          .eq('prospecto_id', prospectoId)
          .select()
          .single();

        if (error) {
          console.warn('⚠️ BotPauseService update by prospecto_id error:', error.message);
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
        console.warn('⚠️ BotPauseService insert by prospecto_id error:', error.message);
        return null;
      }
      return data as BotPauseStatus;
    } catch (error) {
      console.warn('⚠️ BotPauseService savePauseByProspectoId error:', error);
      return null;
    }
  }

  /**
   * Obtener el estado de pausa del bot por prospecto_id
   */
  async getPauseByProspectoId(prospectoId: string): Promise<BotPauseStatus | null> {
    if (!this.client || !this.isValidProspectoId(prospectoId)) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from('bot_pause_status')
        .select('*')
        .eq('prospecto_id', prospectoId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      if (!data.is_paused) return null;
      if (data.paused_until && new Date() > new Date(data.paused_until)) return null;

      return data as BotPauseStatus;
    } catch (error) {
      console.warn('⚠️ BotPauseService getPauseByProspectoId error:', error);
      return null;
    }
  }

  /**
   * Reactivar el bot por prospecto_id
   */
  async resumeBotByProspectoId(prospectoId: string): Promise<boolean> {
    if (!this.client || !this.isValidProspectoId(prospectoId)) {
      return false;
    }

    try {
      const { error } = await this.client
        .from('bot_pause_status')
        .update({
          is_paused: false,
          paused_until: new Date().toISOString()
        })
        .eq('prospecto_id', prospectoId);

      if (error) {
        console.warn('⚠️ BotPauseService resumeBotByProspectoId error:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('⚠️ BotPauseService resumeBotByProspectoId error:', error);
      return false;
    }
  }

  // ============================================
  // MÉTODOS COMUNES
  // ============================================

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
