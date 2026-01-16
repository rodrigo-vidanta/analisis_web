/**
 * ============================================
 * SERVICIO DE TOKENS API - MÓDULO PQNC HUMANS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// SERVICIO PARA GESTIÓN DE TOKENS AI MODELS
// ============================================
//
// ⚠️ MIGRACIÓN 16 Enero 2026:
// - Refactorizado para usar Supabase Auth nativo
// - Usa user_profiles_v2 (basada en auth.users) o auth_user_profiles (legacy)
// - El rol se obtiene del user_metadata en el JWT
//

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// Alias para compatibilidad con código existente
const supabaseAdmin = supabaseSystemUI;

export interface TokenLimits {
  user_id: string;
  monthly_limit: number;
  daily_limit: number;
  current_month_usage: number;
  current_day_usage: number;
  monthly_usage_percentage: number;
  daily_usage_percentage: number;
  warning_threshold: number;
}

export interface UserAIPermissions {
  user_id: string;
  can_use_tts: boolean;
  can_use_advanced_tts: boolean;
  can_use_sound_effects: boolean;
  can_create_voices: boolean;
  can_use_dubbing: boolean;
  can_use_music_generation: boolean;
  can_use_audio_isolation: boolean;
  max_audio_length_seconds: number;
  max_file_size_mb: number;
  allowed_models: string[];
}

export interface TokenUsageStats {
  date: string;
  total_tokens: number;
  tts_tokens: number;
  effects_tokens: number;
  stt_tokens: number;
  operations_count: number;
}

class TokenService {
  
  /**
   * Obtener límites y uso actual de tokens para un usuario
   */
  async getUserTokenInfo(userId: string): Promise<TokenLimits | null> {
    try {
      // Verificar si es admin - primero intentar user_profiles_v2 (Supabase Auth)
      // luego fallback a auth_user_profiles (legacy)
      let userData: { role_id?: string; role_name?: string } | null = null;
      
      // Intentar user_profiles_v2 primero (basada en auth.users)
      const { data: newData, error: newError } = await supabaseAdmin!
        .from('user_profiles_v2')
        .select('role_id, role_name')
        .eq('id', userId)
        .maybeSingle();
      
      if (!newError && newData) {
        userData = newData;
      } else {
        // Fallback a auth_user_profiles (legacy)
        const { data: legacyData, error: legacyError } = await supabaseAdmin!
          .from('auth_user_profiles')
          .select('role_id, role_name')
          .eq('id', userId)
          .maybeSingle();
        
        if (legacyError) {
          console.error('❌ Error obteniendo datos de usuario:', legacyError);
          return null;
        }
        userData = legacyData;
      }
      
      if (!userData) {
        console.warn('⚠️ Usuario no encontrado:', userId);
        return null;
      }

      const isAdmin = userData?.role_name === 'admin';

      // Si es admin, retornar tokens ilimitados
      if (isAdmin) {
        return {
          user_id: userId,
          monthly_limit: -1, // -1 = ilimitado
          daily_limit: -1,
          current_month_usage: 0,
          current_day_usage: 0,
          monthly_usage_percentage: 0,
          daily_usage_percentage: 0,
          warning_threshold: 100
        };
      }

      // Para otros usuarios, obtener límites reales
      const { data, error } = await supabaseAdmin
        .from('ai_token_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error obteniendo límites de tokens:', error);
        return null;
      }

      // Si no existe registro, crear uno por defecto
      if (!data) {
        const defaultLimits = {
          user_id: userId,
          monthly_limit: 10000,
          current_month_usage: 0,
          daily_limit: 500,
          current_day_usage: 0,
          current_month: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
          current_day: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
          auto_reset_monthly: true,
          auto_reset_daily: true,
          notifications_enabled: true,
          warning_threshold: 0.8
        };

        const { data: newData, error: insertError } = await supabaseAdmin
          .from('ai_token_limits')
          .insert([defaultLimits])
          .select('*')
          .single();

        if (insertError) {
          console.error('❌ Error creando límites por defecto:', insertError);
          return null;
        }

        return {
          user_id: userId,
          monthly_limit: newData.monthly_limit,
          daily_limit: newData.daily_limit,
          current_month_usage: 0,
          current_day_usage: 0,
          monthly_usage_percentage: 0,
          daily_usage_percentage: 0,
          warning_threshold: newData.warning_threshold * 100 // Convertir a porcentaje
        };
      }

      return {
        user_id: userId,
        monthly_limit: data.monthly_limit,
        daily_limit: data.daily_limit,
        current_month_usage: data.current_month_usage,
        current_day_usage: data.current_day_usage,
        monthly_usage_percentage: (data.current_month_usage / data.monthly_limit) * 100,
        daily_usage_percentage: (data.current_day_usage / data.daily_limit) * 100,
        warning_threshold: data.warning_threshold * 100 // Convertir a porcentaje
      };
    } catch (error) {
      console.error('❌ Error en getUserTokenInfo:', error);
      return null;
    }
  }

  /**
   * Obtener permisos específicos de AI Models para un usuario
   */
  async getUserAIPermissions(userId: string): Promise<UserAIPermissions | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo permisos AI:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en getUserAIPermissions:', error);
      return null;
    }
  }

  /**
   * Verificar si el usuario puede realizar una operación
   */
  async canUserPerformOperation(
    userId: string, 
    operation: string, 
    tokensRequired: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Verificar límites de tokens
      const tokenInfo = await this.getUserTokenInfo(userId);
      if (!tokenInfo) {
        return { allowed: false, reason: 'No se encontró configuración de tokens' };
      }

      // Si es admin, permitir siempre
      if (tokenInfo.monthly_limit === -1) {
        return { allowed: true };
      }

      // Verificar límite mensual
      if ((tokenInfo.current_month_usage + tokensRequired) > tokenInfo.monthly_limit) {
        return { 
          allowed: false, 
          reason: `Límite mensual excedido: ${tokenInfo.current_month_usage + tokensRequired}/${tokenInfo.monthly_limit}. Contacta al administrador.` 
        };
      }

      // Verificar límite diario
      if ((tokenInfo.current_day_usage + tokensRequired) > tokenInfo.daily_limit) {
        return { 
          allowed: false, 
          reason: `Límite diario excedido: ${tokenInfo.current_day_usage + tokensRequired}/${tokenInfo.daily_limit}. Intenta mañana.` 
        };
      }

      // Verificar permisos específicos
      const permissions = await this.getUserAIPermissions(userId);
      if (!permissions) {
        return { allowed: false, reason: 'No se encontraron permisos de AI Models' };
      }

      const operationPermissions = {
        'text_to_speech': permissions.can_use_tts,
        'text_to_speech_advanced': permissions.can_use_advanced_tts,
        'sound_effects': permissions.can_use_sound_effects,
        'voice_cloning': permissions.can_create_voices,
        'dubbing': permissions.can_use_dubbing,
        'music_generation': permissions.can_use_music_generation,
        'audio_isolation': permissions.can_use_audio_isolation
      };

      if (!operationPermissions[operation as keyof typeof operationPermissions]) {
        return { allowed: false, reason: `No tienes permisos para: ${operation}` };
      }

      return { allowed: true };
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      return { allowed: false, reason: 'Error verificando permisos' };
    }
  }

  /**
   * Registrar uso de tokens
   */
  async recordTokenUsage(
    userId: string,
    operationType: string,
    tokensUsed: number,
    metadata: {
      charactersProcessed?: number;
      audioDurationSeconds?: number;
      voiceId?: string;
      voiceName?: string;
      modelId?: string;
      voiceSettings?: any;
      inputText?: string;
      outputFilePath?: string;
      inputFilePath?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_token_usage')
        .insert({
          user_id: userId,
          operation_type: operationType,
          tokens_used: tokensUsed,
          characters_processed: metadata.charactersProcessed || 0,
          audio_duration_seconds: metadata.audioDurationSeconds || 0,
          voice_id: metadata.voiceId,
          voice_name: metadata.voiceName,
          model_id: metadata.modelId,
          voice_settings: metadata.voiceSettings,
          input_text: metadata.inputText,
          output_file_path: metadata.outputFilePath,
          input_file_path: metadata.inputFilePath
        });

      if (error) {
        console.error('❌ Error registrando uso de tokens:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en recordTokenUsage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtener estadísticas de uso por período
   */
  async getUserTokenStats(userId: string, days: number = 30): Promise<TokenUsageStats[]> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_user_token_stats', {
          p_user_id: userId,
          p_days: days
        });

      if (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getUserTokenStats:', error);
      return [];
    }
  }

  /**
   * Actualizar límites de tokens (solo admins)
   */
  async updateTokenLimits(
    userId: string,
    monthlyLimit: number,
    dailyLimit: number,
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_token_limits')
        .upsert({
          user_id: userId,
          monthly_limit: monthlyLimit,
          daily_limit: dailyLimit,
          created_by: adminUserId,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error actualizando límites:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en updateTokenLimits:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Actualizar permisos específicos de AI Models (solo admins)
   */
  async updateUserAIPermissions(
    userId: string,
    permissions: Partial<UserAIPermissions>,
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_user_permissions')
        .upsert({
          user_id: userId,
          ...permissions,
          configured_by: adminUserId,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error actualizando permisos AI:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en updateUserAIPermissions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtener todos los usuarios con información de tokens (solo admins)
   */
  async getAllUsersTokenInfo(): Promise<TokenLimits[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_user_token_info')
        .select('*')
        .order('monthly_usage_percentage', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo info de todos los usuarios:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getAllUsersTokenInfo:', error);
      return [];
    }
  }

  /**
   * Resetear uso mensual/diario (función admin)
   */
  async resetTokenUsage(
    userId: string,
    resetType: 'monthly' | 'daily' | 'both',
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (resetType === 'monthly' || resetType === 'both') {
        updateData.current_month_usage = 0;
        updateData.current_month = new Date().toISOString().split('T')[0];
      }

      if (resetType === 'daily' || resetType === 'both') {
        updateData.current_day_usage = 0;
        updateData.current_day = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabaseAdmin
        .from('ai_token_limits')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error reseteando uso:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en resetTokenUsage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Calcular tokens requeridos para una operación
   */
  calculateTokensRequired(
    operationType: string,
    text: string,
    duration?: number,
    modelId?: string
  ): number {
    const baseTokens = {
      'text_to_speech': Math.ceil(text.length / 4), // ~4 caracteres por token
      'speech_to_text': Math.ceil((duration || 60) / 6), // ~6 segundos por token
      'sound_effects': Math.ceil((duration || 10) * 2), // ~2 tokens por segundo
      'voice_cloning': 1000, // Costo fijo alto
      'dubbing': Math.ceil((duration || 60) * 5), // ~5 tokens por segundo
      'music_generation': Math.ceil((duration || 30) * 3), // ~3 tokens por segundo
      'audio_isolation': Math.ceil((duration || 60) / 3) // ~3 segundos por token
    };

    const base = baseTokens[operationType as keyof typeof baseTokens] || 10;
    
    // Multiplicadores por modelo
    const modelMultipliers: Record<string, number> = {
      'eleven_turbo_v2': 0.3,
      'eleven_multilingual_v2': 1.0,
      'eleven_multilingual_v1': 1.2,
      'eleven_monolingual_v1': 1.0
    };

    const multiplier = modelMultipliers[modelId || 'eleven_multilingual_v2'] || 1.0;
    
    return Math.ceil(base * multiplier);
  }

  /**
   * Obtener color para visualización de uso
   */
  getUsageColor(percentage: number): { color: string; bgColor: string; textColor: string } {
    if (percentage >= 90) {
      return { 
        color: '#EF4444', 
        bgColor: 'bg-red-500', 
        textColor: 'text-red-600 dark:text-red-400' 
      };
    } else if (percentage >= 80) {
      return { 
        color: '#F59E0B', 
        bgColor: 'bg-orange-500', 
        textColor: 'text-orange-600 dark:text-orange-400' 
      };
    } else if (percentage >= 60) {
      return { 
        color: '#EAB308', 
        bgColor: 'bg-yellow-500', 
        textColor: 'text-yellow-600 dark:text-yellow-400' 
      };
    } else {
      return { 
        color: '#10B981', 
        bgColor: 'bg-green-500', 
        textColor: 'text-green-600 dark:text-green-400' 
      };
    }
  }

  /**
   * Verificar si un usuario puede usar tokens (alias para compatibilidad)
   */
  async canUseTokens(
    userId: string, 
    operation: string, 
    tokensRequired: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Verificar límites de tokens
      const tokenInfo = await this.getUserTokenInfo(userId);
      if (!tokenInfo) {
        return { allowed: false, reason: 'No se encontró configuración de tokens' };
      }

      // Si es admin (tokens ilimitados), permitir siempre
      if (tokenInfo.monthly_limit === -1) {
        return { allowed: true };
      }

      // Verificar límite mensual
      if ((tokenInfo.current_month_usage + tokensRequired) > tokenInfo.monthly_limit) {
        return { 
          allowed: false, 
          reason: `Límite mensual excedido: ${tokenInfo.current_month_usage + tokensRequired}/${tokenInfo.monthly_limit}. Contacta al administrador.` 
        };
      }

      // Verificar límite diario
      if ((tokenInfo.current_day_usage + tokensRequired) > tokenInfo.daily_limit) {
        return { 
          allowed: false, 
          reason: `Límite diario excedido: ${tokenInfo.current_day_usage + tokensRequired}/${tokenInfo.daily_limit}. Intenta mañana.` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('❌ Error verificando tokens:', error);
      return { allowed: false, reason: 'Error verificando límites de tokens' };
    }
  }

  /**
   * Consumir tokens después de una operación exitosa
   */
  async consumeTokens(
    userId: string,
    operation: string,
    tokensUsed: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Si es admin, no consumir tokens
      const tokenInfo = await this.getUserTokenInfo(userId);
      if (tokenInfo?.monthly_limit === -1) {
        console.log('🔓 Admin: tokens no consumidos');
        return { success: true };
      }

      // Actualizar uso de tokens
      // Primero obtener los valores actuales
      const { data: currentData, error: fetchError } = await supabaseAdmin
        .from('ai_token_limits')
        .select('current_month_usage, current_day_usage')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Calcular nuevos valores
      const newMonthUsage = (currentData.current_month_usage || 0) + tokensUsed;
      const newDayUsage = (currentData.current_day_usage || 0) + tokensUsed;

      // Actualizar con valores calculados
      const { error } = await supabaseAdmin
        .from('ai_token_limits')
        .update({
          current_month_usage: newMonthUsage,
          current_day_usage: newDayUsage,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`💰 Tokens consumidos: ${tokensUsed} (${operation})`);
      
      // Disparar evento para actualizar indicadores
      window.dispatchEvent(new CustomEvent('tokensUpdated', { 
        detail: { userId, tokensUsed, operation } 
      }));
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error consumiendo tokens:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}

// Exportar instancia singleton
export const tokenService = new TokenService();
export default tokenService;
