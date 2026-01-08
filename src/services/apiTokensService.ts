/**
 * ============================================
 * SERVICIO DE TOKENS DE AUTENTICACIÓN API
 * ============================================
 * 
 * Gestiona tokens de autenticación para webhooks y APIs externas
 * Incluye caché local para rendimiento
 * 
 * 📋 Tabla: api_auth_tokens (SystemUI)
 * 📍 Ubicación: zbylezfyagwrxoecioup.supabase.co
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-01-07):
 * - Los tokens están almacenados en BD (SystemUI → api_auth_tokens)
 * - Los DEFAULT_TOKENS son solo fallback de emergencia
 * - Usar el panel Administración > Credenciales para gestionar tokens
 */

import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// Tokens de emergencia (fallback solo si BD no está disponible)
// ⚠️ ESTOS VALORES DEBEN COINCIDIR CON LA BD - NO EDITAR AQUÍ
const DEFAULT_TOKENS: Record<string, string> = {
  // Los valores reales están en SystemUI → api_auth_tokens
  // Estos son solo fallbacks de emergencia
  manual_call_auth: '',
  send_message_auth: '',
  pause_bot_auth: '',
  media_url_auth: '',
  whatsapp_templates_auth: '',
  broadcast_auth: ''
};

// Caché local para evitar consultas repetidas
let tokenCache: Record<string, string> = { ...DEFAULT_TOKENS };
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene un token de autenticación por su clave
 * @param tokenKey - Clave del token (ej: 'manual_call_auth')
 * @returns Token de autenticación
 */
export const getApiToken = async (tokenKey: string): Promise<string> => {
  // Si el caché es válido, usarlo
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL && tokenCache[tokenKey]) {
    return tokenCache[tokenKey];
  }

  try {
    // Intentar cargar desde BD
    const { data, error } = await supabaseSystemUIAdmin
      .from('api_auth_tokens')
      .select('token_key, token_value')
      .eq('token_key', tokenKey)
      .single();

    if (error) {
      // Si hay error (tabla no existe o no hay registro), usar default
      console.log(`⚠️ Token ${tokenKey} no encontrado en BD, usando valor por defecto`);
      return DEFAULT_TOKENS[tokenKey] || '';
    }

    // Actualizar caché
    if (data) {
      tokenCache[data.token_key] = data.token_value;
      cacheTimestamp = now;
      return data.token_value;
    }
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
  }

  // Fallback a valores por defecto
  return DEFAULT_TOKENS[tokenKey] || '';
};

/**
 * Obtiene todos los tokens de autenticación
 * @returns Objeto con todos los tokens
 */
export const getAllApiTokens = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  
  // Si el caché es válido y tiene todos los tokens
  if (now - cacheTimestamp < CACHE_TTL && Object.keys(tokenCache).length === Object.keys(DEFAULT_TOKENS).length) {
    return { ...tokenCache };
  }

  try {
    const { data, error } = await supabaseSystemUIAdmin
      .from('api_auth_tokens')
      .select('token_key, token_value');

    if (error) {
      console.log('⚠️ No se pudieron cargar tokens de BD, usando valores por defecto');
      return { ...DEFAULT_TOKENS };
    }

    if (data && data.length > 0) {
      // Actualizar caché con todos los tokens de BD
      data.forEach(t => {
        tokenCache[t.token_key] = t.token_value;
      });
      cacheTimestamp = now;
      return { ...DEFAULT_TOKENS, ...tokenCache };
    }
  } catch (error) {
    console.error('❌ Error obteniendo tokens:', error);
  }

  return { ...DEFAULT_TOKENS };
};

/**
 * Actualiza un token en la caché local
 * (Se usa cuando se edita desde el panel de admin sin esperar BD)
 */
export const updateTokenCache = (tokenKey: string, value: string): void => {
  tokenCache[tokenKey] = value;
  cacheTimestamp = Date.now();
};

/**
 * Invalida la caché para forzar recarga
 */
export const invalidateTokenCache = (): void => {
  cacheTimestamp = 0;
};

/**
 * Actualiza el token por defecto (útil para actualizar en runtime)
 */
export const setDefaultToken = (tokenKey: string, value: string): void => {
  DEFAULT_TOKENS[tokenKey] = value;
  tokenCache[tokenKey] = value;
};

export const apiTokensService = {
  getApiToken,
  getAllApiTokens,
  updateTokenCache,
  invalidateTokenCache,
  setDefaultToken
};

export default apiTokensService;

