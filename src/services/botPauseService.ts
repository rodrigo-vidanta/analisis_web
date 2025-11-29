/**
 * ============================================
 * SERVICIO DE GESTIÓN DE PAUSA DEL BOT
 * ============================================
 * 
 * Maneja el estado de pausa del bot en la base de datos
 * para persistencia entre sesiones de usuarios
 * 
 * ⚠️ NOTA DE SEGURIDAD:
 * Este servicio usa HTTP requests directos con service key.
 * - Las service keys están expuestas en el frontend (práctica establecida en el proyecto)
 * - Las políticas RLS deben estar correctamente configuradas como capa adicional de seguridad
 * - En producción ideal, estas operaciones deberían ejecutarse desde un backend
 * 
 * Usa HTTP requests directos para evitar problemas con RLS y cache de PostgREST
 */

import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../config/supabaseSystemUI';

export interface BotPauseStatus {
  id?: string;
  uchat_id: string;
  is_paused: boolean;
  paused_until: string | null; // ISO string o null para indefinido
  paused_by: string;
  duration_minutes: number | null; // null para indefinido
  paused_at: string;
  created_at?: string;
  updated_at?: string;
}

class BotPauseService {
  /**
   * Guardar o actualizar el estado de pausa del bot usando HTTP directo
   */
  async savePauseStatus(
    uchatId: string,
    durationMinutes: number | null, // null para indefinido (1 mes)
    pausedBy: string = 'agent'
  ): Promise<BotPauseStatus | null> {
    try {
      const now = new Date();
      let pausedUntil: Date | null = null;

      if (durationMinutes === null) {
        // Indefinido = 1 mes
        pausedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
      } else {
        // Duración específica
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

      // Verificar si existe usando HTTP directo
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/bot_pause_status?uchat_id=eq.${encodeURIComponent(uchatId)}&select=id`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (checkResponse.ok) {
        const existing = await checkResponse.json();
        
        if (existing && existing.length > 0) {
          // Actualizar registro existente usando HTTP directo
          const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/bot_pause_status?uchat_id=eq.${encodeURIComponent(uchatId)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(pauseData)
            }
          );

          if (updateResponse.ok) {
            const result = await updateResponse.json();
            return result[0] as BotPauseStatus;
          } else {
            const errorText = await updateResponse.text();
            console.error('❌ Error actualizando estado de pausa:', errorText);
            return null;
          }
        }
      }

      // Crear nuevo registro usando HTTP directo
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/bot_pause_status`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(pauseData)
        }
      );

      if (insertResponse.ok) {
        const result = await insertResponse.json();
        return result[0] || result as BotPauseStatus;
      } else {
        const errorText = await insertResponse.text();
        console.error('❌ Error creando estado de pausa:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error guardando estado de pausa:', error);
      return null;
    }
  }

  /**
   * Obtener el estado de pausa del bot usando HTTP directo
   */
  async getPauseStatus(uchatId: string): Promise<BotPauseStatus | null> {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bot_pause_status?uchat_id=eq.${encodeURIComponent(uchatId)}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 406 || response.status === 404) {
          // No existe registro o error de RLS, retornar null
          return null;
        }
        const errorText = await response.text();
        console.error('❌ Error obteniendo estado de pausa:', errorText);
        return null;
      }

      const dataArray = await response.json();
      
      if (!dataArray || dataArray.length === 0) {
        return null;
      }

      const data = dataArray[0] as BotPauseStatus;

      // Verificar si la pausa ya expiró
      if (data.is_paused && data.paused_until) {
        const pausedUntil = new Date(data.paused_until);
        const now = new Date();
        
        if (now > pausedUntil) {
          // La pausa expiró, eliminarla
          await this.resumeBot(uchatId);
          return null;
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Error obteniendo estado de pausa:', error);
      return null;
    }
  }

  /**
   * Obtener todos los estados de pausa activos usando HTTP directo
   */
  async getAllActivePauses(): Promise<BotPauseStatus[]> {
    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bot_pause_status?is_paused=eq.true&paused_until=gt.${encodeURIComponent(now)}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error obteniendo pausas activas:', errorText);
        return [];
      }

      const data = await response.json();
      return (data || []) as BotPauseStatus[];
    } catch (error) {
      console.error('❌ Error obteniendo pausas activas:', error);
      return [];
    }
  }

  /**
   * Reactivar el bot (eliminar estado de pausa) usando HTTP directo
   */
  async resumeBot(uchatId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bot_pause_status?uchat_id=eq.${encodeURIComponent(uchatId)}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error reactivando bot:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error reactivando bot:', error);
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
    const remaining = Math.max(0, Math.floor((pausedUntil.getTime() - now.getTime()) / 1000));
    
    return remaining;
  }
}

export const botPauseService = new BotPauseService();
export default botPauseService;

