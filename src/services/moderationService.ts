import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// SERVICIO DE MODERACIÓN DE CONTENIDO
// ============================================

export interface ModerationWarning {
  id: string;
  user_id: string;
  user_email?: string;
  input_text: string;
  warning_reason: string;
  warning_category: 'vulgaridad' | 'amenazas' | 'discriminacion' | 'ilegal' | 'spam' | 'sexual' | 'otro';
  output_selected?: string;
  was_sent: boolean;
  conversation_id?: string;
  prospect_id?: string;
  created_at: string;
}

export interface UserWarningStats {
  total_warnings: number;
  warnings_last_30_days: number;
  warnings_last_7_days: number;
  last_warning_at: string | null;
  is_blocked: boolean;
}

// Exportar tipos explícitamente
export type { ModerationWarning, UserWarningStats };

export class ModerationService {
  /**
   * Registrar un warning de moderación
   */
  static async registerWarning(
    userId: string,
    userEmail: string | undefined,
    inputText: string,
    warningReason: string,
    warningCategory: ModerationWarning['warning_category'],
    outputSelected?: string,
    conversationId?: string,
    prospectId?: string
  ): Promise<string | null> {
    try {
      // Log solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('🛡️ Registrando warning de moderación:', {
          userId,
          category: warningCategory,
          reason: warningReason.substring(0, 50)
        });
      }

      const { data, error } = await supabaseSystemUI.rpc('register_moderation_warning', {
        p_user_id: userId,
        p_user_email: userEmail || null,
        p_input_text: inputText,
        p_warning_reason: warningReason,
        p_warning_category: warningCategory,
        p_output_selected: outputSelected || null,
        p_conversation_id: conversationId || null,
        p_prospect_id: prospectId || null
      });

      if (error) {
        console.error('❌ Error registrando warning:', error);
        return null;
      }

      // Log solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('✅ Warning registrado:', data);
      }
      return data;
    } catch (error) {
      console.error('❌ Error en registerWarning:', error);
      return null;
    }
  }

  /**
   * Verificar si un usuario está bloqueado (3+ warnings)
   */
  static async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('is_user_blocked', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Error verificando bloqueo:', error);
        return false; // En caso de error, permitir el envío (fail-open)
      }

      return data === true;
    } catch (error) {
      console.error('❌ Error en isUserBlocked:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de warnings de un usuario
   */
  static async getUserWarningStats(userId: string): Promise<UserWarningStats | null> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('get_user_warnings', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Error obteniendo stats de warnings:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          total_warnings: 0,
          warnings_last_30_days: 0,
          warnings_last_7_days: 0,
          last_warning_at: null,
          is_blocked: false
        };
      }

      return data[0];
    } catch (error) {
      console.error('❌ Error en getUserWarningStats:', error);
      return null;
    }
  }

  /**
   * Marcar un warning como "mensaje enviado" (cuando el usuario decide enviar a pesar del warning)
   */
  static async markWarningAsSent(warningId: string): Promise<boolean> {
    try {
      const { error } = await supabaseSystemUI
        .from('content_moderation_warnings')
        .update({ was_sent: true })
        .eq('id', warningId);

      if (error) {
        console.error('❌ Error marcando warning como enviado:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markWarningAsSent:', error);
      return false;
    }
  }

  /**
   * Obtener warnings de un usuario (últimos N)
   */
  static async getUserWarnings(
    userId: string,
    limit: number = 10
  ): Promise<ModerationWarning[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('content_moderation_warnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error obteniendo warnings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getUserWarnings:', error);
      return [];
    }
  }
}

export default ModerationService;

