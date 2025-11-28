/**
 * ============================================
 * SERVICIO DE LOGS DE INICIO DE SESIÓN
 * ============================================
 * 
 * Registra todos los intentos de inicio de sesión con información detallada
 */

import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

export interface LoginLog {
  id: string;
  user_id?: string;
  email: string;
  session_token?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  login_status: 'success' | 'failed' | 'blocked' | 'expired';
  failure_reason?: string;
  login_method?: string;
  location_country?: string;
  location_city?: string;
  is_suspicious: boolean;
  suspicious_reasons?: string[];
  created_at: string;
  expires_at?: string;
  last_activity?: string;
}

export interface LoginSummary {
  user_id: string;
  email: string;
  full_name: string;
  successful_logins: number;
  failed_logins: number;
  last_successful_login?: string;
  last_failed_login?: string;
  suspicious_logins: number;
  unique_ip_addresses: number;
  unique_devices: number;
}

class LoginLogService {
  /**
   * Registra un intento de login
   */
  async logLogin(params: {
    user_id?: string;
    email: string;
    session_token?: string;
    ip_address?: string;
    user_agent?: string;
    login_status: 'success' | 'failed' | 'blocked' | 'expired';
    failure_reason?: string;
    expires_at?: string;
  }): Promise<string | null> {
    try {
      // Obtener IP del cliente
      const ipAddress = params.ip_address || await this.getClientIP();
      
      // Parsear user agent
      const deviceInfo = this.parseUserAgent(params.user_agent || navigator.userAgent);

      // Llamar a la función SQL que maneja la lógica completa
      // IMPORTANTE: Orden de parámetros: obligatorios primero, opcionales al final
      const { data, error } = await supabaseSystemUIAdmin.rpc('log_user_login', {
        p_email: params.email,
        p_ip_address: ipAddress,
        p_user_agent: params.user_agent || navigator.userAgent,
        p_login_status: params.login_status,
        p_user_id: params.user_id || null,
        p_session_token: params.session_token || null,
        p_failure_reason: params.failure_reason || null,
        p_expires_at: params.expires_at || null
      });

      if (error) {
        console.error('Error logging login:', error);
        // Si la función RPC no existe, insertar directamente
        return await this.logLoginDirect(params, ipAddress, deviceInfo);
      }

      return data as string;
    } catch (error) {
      console.error('Error in logLogin:', error);
      return null;
    }
  }

  /**
   * Registra login directamente si la función RPC no está disponible
   */
  private async logLoginDirect(
    params: {
      user_id?: string;
      email: string;
      session_token?: string;
      login_status: 'success' | 'failed' | 'blocked' | 'expired';
      failure_reason?: string;
      expires_at?: string;
    },
    ipAddress: string,
    deviceInfo: {
      device_type: string;
      browser: string;
      browser_version: string;
      os: string;
      os_version: string;
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_login_logs')
        .insert({
          user_id: params.user_id || null,
          email: params.email,
          session_token: params.session_token || null,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browser_version,
          os: deviceInfo.os,
          os_version: deviceInfo.os_version,
          login_status: params.login_status,
          failure_reason: params.failure_reason || null,
          expires_at: params.expires_at || null
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error in logLoginDirect:', error);
      return null;
    }
  }

  /**
   * Obtiene los logs de login de un usuario
   */
  async getUserLoginLogs(userId: string, limit: number = 50): Promise<LoginLog[]> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_login_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as LoginLog[];
    } catch (error) {
      console.error('Error getting user login logs:', error);
      return [];
    }
  }

  /**
   * Obtiene resumen de logins de un usuario
   */
  async getUserLoginSummary(userId: string): Promise<LoginSummary | null> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('v_user_login_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as LoginSummary;
    } catch (error) {
      console.error('Error getting login summary:', error);
      return null;
    }
  }

  /**
   * Obtiene logs sospechosos
   */
  async getSuspiciousLogs(limit: number = 100): Promise<LoginLog[]> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_login_logs')
        .select('*')
        .eq('is_suspicious', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as LoginLog[];
    } catch (error) {
      console.error('Error getting suspicious logs:', error);
      return [];
    }
  }

  /**
   * Actualiza última actividad de una sesión
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    try {
      await supabaseSystemUIAdmin
        .from('auth_login_logs')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_token', sessionToken)
        .eq('login_status', 'success');
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Parsea user agent para extraer información del dispositivo
   */
  private parseUserAgent(userAgent: string): {
    device_type: string;
    browser: string;
    browser_version: string;
    os: string;
    os_version: string;
  } {
    let device_type = 'desktop';
    let browser = 'Unknown';
    let browser_version = '';
    let os = 'Unknown';
    let os_version = '';

    // Detectar tipo de dispositivo
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device_type = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detectar navegador
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
    const safariMatch = userAgent.match(/Safari\/(\d+)/);
    const edgeMatch = userAgent.match(/Edge\/(\d+)/);

    if (chromeMatch && !edgeMatch) {
      browser = 'Chrome';
      browser_version = chromeMatch[1];
    } else if (firefoxMatch) {
      browser = 'Firefox';
      browser_version = firefoxMatch[1];
    } else if (safariMatch && !chromeMatch) {
      browser = 'Safari';
      browser_version = safariMatch[1];
    } else if (edgeMatch) {
      browser = 'Edge';
      browser_version = edgeMatch[1];
    }

    // Detectar OS
    const windowsMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
    const macMatch = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    const linuxMatch = userAgent.match(/Linux/);
    const androidMatch = userAgent.match(/Android (\d+\.\d+)/);
    const iosMatch = userAgent.match(/OS (\d+[._]\d+)/);

    if (windowsMatch) {
      os = 'Windows';
      os_version = windowsMatch[1];
    } else if (macMatch) {
      os = 'macOS';
      os_version = macMatch[1].replace('_', '.');
    } else if (linuxMatch) {
      os = 'Linux';
    } else if (androidMatch) {
      os = 'Android';
      os_version = androidMatch[1];
    } else if (iosMatch) {
      os = 'iOS';
      os_version = iosMatch[1].replace('_', '.');
    }

    return {
      device_type,
      browser,
      browser_version,
      os,
      os_version
    };
  }

  /**
   * Obtiene IP del cliente
   */
  private async getClientIP(): Promise<string> {
    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '127.0.0.1';
      }
      
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
  }
}

export const loginLogService = new LoginLogService();
export default loginLogService;

