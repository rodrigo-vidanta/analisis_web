import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// ============================================
// SERVICIO DE LOGS DE PARÁFRASIS
// ============================================

export interface ParaphraseLog {
  id: string;
  user_id: string;
  user_email?: string;
  input_text: string;
  option1: string;
  option2: string;
  output_selected?: string;
  selected_option_number?: number;
  has_moderation_warning: boolean;
  warning_id?: string;
  conversation_id?: string;
  prospect_id?: string;
  model_used: string;
  processing_time_ms?: number;
  created_at: string;
}

export interface UserWarningCounter {
  total_warnings: number;
  warnings_last_30_days: number;
  warnings_last_7_days: number;
  last_warning_at: string | null;
  is_blocked: boolean;
}

export class ParaphraseLogService {
  /**
   * Registrar un log completo de parafraseo
   */
  static async registerLog(
    userId: string,
    userEmail: string | undefined,
    inputText: string,
    option1: string,
    option2: string,
    outputSelected?: string,
    selectedOptionNumber?: number,
    hasModerationWarning: boolean = false,
    warningId?: string,
    conversationId?: string,
    prospectId?: string,
    processingTimeMs?: number
  ): Promise<string | null> {
    try {
      // Log solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('📝 Registrando log de parafraseo:', {
          userId,
          hasWarning: hasModerationWarning,
          selectedOption: selectedOptionNumber
        });
      }

      const { data, error } = await supabaseSystemUI.rpc('register_paraphrase_log', {
        p_user_id: userId,
        p_user_email: userEmail || null,
        p_input_text: inputText,
        p_option1: option1,
        p_option2: option2,
        p_output_selected: outputSelected || null,
        p_selected_option_number: selectedOptionNumber || null,
        p_has_moderation_warning: hasModerationWarning,
        p_warning_id: warningId || null,
        p_conversation_id: conversationId || null,
        p_prospect_id: prospectId || null,
        p_processing_time_ms: processingTimeMs || null
      });

      if (error) {
        console.error('❌ Error registrando log de parafraseo:', error);
        return null;
      }

      // Log solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('✅ Log de parafraseo registrado:', data);
      }
      return data;
    } catch (error) {
      console.error('❌ Error en registerLog:', error);
      return null;
    }
  }

  /**
   * Obtener contador de warnings optimizado
   */
  static async getUserWarningCounter(userId: string): Promise<UserWarningCounter | null> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('get_user_warning_counter', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Error obteniendo contador de warnings:', error);
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
      console.error('❌ Error en getUserWarningCounter:', error);
      return null;
    }
  }

  /**
   * Verificar si un usuario está bloqueado (usa contador optimizado)
   */
  static async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const counter = await this.getUserWarningCounter(userId);
      return counter?.is_blocked || false;
    } catch (error) {
      console.error('❌ Error en isUserBlocked:', error);
      return false;
    }
  }

  /**
   * Obtener logs de parafraseo de un usuario
   */
  static async getUserLogs(
    userId: string,
    limit: number = 50
  ): Promise<ParaphraseLog[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('paraphrase_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error obteniendo logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getUserLogs:', error);
      return [];
    }
  }

  /**
   * Resetear warnings de un usuario (desbloquear)
   */
  static async resetUserWarnings(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('reset_user_warnings', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Error reseteando warnings:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('❌ Error en resetUserWarnings:', error);
      return false;
    }
  }

  /**
   * Obtener contadores de warnings para múltiples usuarios
   */
  static async getMultipleUserWarningCounters(userIds: string[]): Promise<Record<string, UserWarningCounter>> {
    try {
      if (!userIds || userIds.length === 0) {
        return {};
      }

      // Usar admin client para bypass de RLS (necesario porque estamos en PQNC_AI y consultando System_UI)
      const { data, error } = await supabaseSystemUIAdmin
        .from('user_warning_counters')
        .select('*')
        .in('user_id', userIds);

      if (error) {
        console.error('❌ Error obteniendo contadores:', error);
        return {};
      }

      const result: Record<string, UserWarningCounter> = {};
      (data || []).forEach(counter => {
        result[counter.user_id] = {
          total_warnings: counter.total_warnings,
          warnings_last_30_days: counter.warnings_last_30_days,
          warnings_last_7_days: counter.warnings_last_7_days,
          last_warning_at: counter.last_warning_at,
          is_blocked: counter.is_blocked
        };
      });

      return result;
    } catch (error) {
      console.error('❌ Error en getMultipleUserWarningCounters:', error);
      return {};
    }
  }
}

export default ParaphraseLogService;

