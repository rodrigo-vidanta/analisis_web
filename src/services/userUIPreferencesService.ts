/**
 * ============================================
 * SERVICIO DE PREFERENCIAS DE UI POR USUARIO
 * ============================================
 * 
 * Maneja preferencias de interfaz de usuario almacenadas en BD.
 * Incluye Panel Lateral y futuras preferencias de UI.
 * 
 * Tabla: user_ui_preferences (PQNC_AI)
 * 
 * ⚠️ ACTUALIZACIÓN 20 Enero 2026:
 * - Migrado a usar funciones RPC (SECURITY DEFINER) para bypass RLS
 * - Funciones: get_user_ui_preferences, upsert_user_ui_preferences
 * - Esto resuelve el error 406 cuando el cliente no tiene sesión cargada
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// Roles que tienen el widget habilitado por defecto
const WIDGET_ENABLED_BY_DEFAULT_ROLES = ['ejecutivo', 'supervisor'];

// Roles que tienen el widget deshabilitado por defecto
const WIDGET_DISABLED_BY_DEFAULT_ROLES = ['coordinador', 'administrador', 'administrador_operativo', 'direccion'];

export interface UserUIPreferences {
  id: string;
  user_id: string;
  live_activity_widget_enabled: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

class UserUIPreferencesService {
  
  /**
   * Obtiene el valor por defecto del widget según el rol del usuario
   */
  getDefaultByRole(roleName: string | undefined | null): boolean {
    if (!roleName) return false;
    
    const roleNameLower = roleName.toLowerCase();
    
    if (WIDGET_ENABLED_BY_DEFAULT_ROLES.includes(roleNameLower)) {
      return true;
    }
    
    if (WIDGET_DISABLED_BY_DEFAULT_ROLES.includes(roleNameLower)) {
      return false;
    }
    
    // Por defecto, deshabilitado para roles desconocidos
    return false;
  }
  
  /**
   * Obtiene las preferencias de UI de un usuario
   * Usa función RPC para bypass de RLS (SECURITY DEFINER)
   */
  async getUserPreferences(userId: string): Promise<UserUIPreferences | null> {
    try {
      if (!supabaseSystemUI) {
        console.error('[UserUIPreferencesService] supabaseSystemUI no disponible');
        return null;
      }
      
      const { data, error } = await supabaseSystemUI.rpc('get_user_ui_preferences', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('[UserUIPreferencesService] Error obteniendo preferencias:', error);
        return null;
      }
      
      // La función RPC retorna un array, tomamos el primer elemento
      if (!data || data.length === 0) {
        return null;
      }
      
      return data[0] as UserUIPreferences;
    } catch (error) {
      console.error('[UserUIPreferencesService] Error:', error);
      return null;
    }
  }
  
  /**
   * Obtiene si el Live Activity Widget está habilitado para un usuario
   * Si no existe registro, retorna el valor por defecto según el rol
   */
  async getLiveActivityWidgetEnabled(userId: string, roleName?: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      if (preferences !== null) {
        return preferences.live_activity_widget_enabled;
      }
      
      // No hay registro, usar default por rol
      return this.getDefaultByRole(roleName);
    } catch (error) {
      console.error('[UserUIPreferencesService] Error obteniendo estado del widget:', error);
      return this.getDefaultByRole(roleName);
    }
  }
  
  /**
   * Establece si el Live Activity Widget está habilitado para un usuario
   * Usa función RPC para bypass de RLS (SECURITY DEFINER)
   */
  async setLiveActivityWidgetEnabled(userId: string, enabled: boolean): Promise<boolean> {
    try {
      if (!supabaseSystemUI) {
        console.error('[UserUIPreferencesService] supabaseSystemUI no disponible');
        return false;
      }
      
      const { data, error } = await supabaseSystemUI.rpc('upsert_user_ui_preferences', {
        p_user_id: userId,
        p_live_activity_widget_enabled: enabled
      });
      
      if (error) {
        console.error('[UserUIPreferencesService] Error guardando preferencia:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('[UserUIPreferencesService] Error:', error);
      return false;
    }
  }
  
  /**
   * Actualiza preferencias adicionales en el campo JSONB
   * Usa función RPC para bypass de RLS (SECURITY DEFINER)
   */
  async updateAdditionalPreferences(
    userId: string, 
    preferences: Record<string, unknown>
  ): Promise<boolean> {
    try {
      if (!supabaseSystemUI) {
        console.error('[UserUIPreferencesService] supabaseSystemUI no disponible');
        return false;
      }
      
      // Primero obtener preferencias actuales
      const current = await this.getUserPreferences(userId);
      
      const mergedPreferences = {
        ...(current?.preferences || {}),
        ...preferences
      };
      
      const { data, error } = await supabaseSystemUI.rpc('upsert_user_ui_preferences', {
        p_user_id: userId,
        p_preferences: mergedPreferences
      });
      
      if (error) {
        console.error('[UserUIPreferencesService] Error actualizando preferencias:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('[UserUIPreferencesService] Error:', error);
      return false;
    }
  }
  
  /**
   * Obtiene una preferencia adicional específica del campo JSONB
   */
  async getAdditionalPreference<T>(userId: string, key: string, defaultValue: T): Promise<T> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      if (preferences?.preferences && key in preferences.preferences) {
        return preferences.preferences[key] as T;
      }
      
      return defaultValue;
    } catch (error) {
      console.error('[UserUIPreferencesService] Error obteniendo preferencia:', error);
      return defaultValue;
    }
  }
}

export const userUIPreferencesService = new UserUIPreferencesService();
