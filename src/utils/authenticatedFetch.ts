/**
 * ============================================
 * UTILIDAD: Fetch Autenticado con Manejo de 401
 * ============================================
 * 
 * Wrapper para fetch que:
 * 1. Agrega automáticamente el JWT de autenticación
 * 2. Intercepta respuestas 401 (Unauthorized)
 * 3. Intenta refrescar el token una vez
 * 4. Dispara evento de logout si el refresh falla
 * 
 * Uso:
 *   import { authenticatedFetch } from '../utils/authenticatedFetch';
 *   const response = await authenticatedFetch('/api/endpoint', { method: 'POST', body: ... });
 * 
 * Fecha: 30 Enero 2026
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// Evento personalizado para notificar logout forzado
export const AUTH_EXPIRED_EVENT = 'auth:session-expired';

/**
 * Dispara evento de sesión expirada para que AuthContext lo maneje
 */
export const triggerSessionExpired = (reason: string = 'Tu sesión ha expirado') => {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason } }));
};

/**
 * Obtiene el token de acceso actual, intentando refrescar si está expirado
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (!supabaseSystemUI) return null;

  try {
    let { data: { session } } = await supabaseSystemUI.auth.getSession();

    if (!session) {
      return null;
    }

    // Verificar si el token está por expirar (menos de 1 minuto)
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now() + 60000) {
      console.log('🔄 [AuthFetch] Token próximo a expirar, refrescando...');
      const { data: refreshData, error: refreshError } = await supabaseSystemUI.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('❌ [AuthFetch] No se pudo refrescar el token:', refreshError);
        return null;
      }
      
      session = refreshData.session;
      console.log('✅ [AuthFetch] Token refrescado');
    }

    return session.access_token;
  } catch (error) {
    console.error('❌ [AuthFetch] Error obteniendo token:', error);
    return null;
  }
}

/**
 * Fetch autenticado con manejo de 401
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Obtener token válido
  const token = await getValidAccessToken();
  
  if (!token) {
    triggerSessionExpired('No se pudo obtener un token válido');
    throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
  }

  // Preparar headers
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Hacer la petición
  const response = await fetch(url, { ...options, headers });

  // Manejar 401
  if (response.status === 401) {
    console.log('🔐 [AuthFetch] Recibido 401, intentando refrescar token...');
    
    // Intentar refrescar el token una vez más
    const { data: refreshData, error: refreshError } = await supabaseSystemUI!.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      console.error('❌ [AuthFetch] Refresh después de 401 falló');
      triggerSessionExpired('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }

    // Reintentar la petición con el nuevo token
    console.log('🔄 [AuthFetch] Reintentando petición con nuevo token...');
    headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
    const retryResponse = await fetch(url, { ...options, headers });
    
    if (retryResponse.status === 401) {
      // Si sigue fallando, forzar logout
      triggerSessionExpired('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }

    return retryResponse;
  }

  return response;
}

/**
 * Fetch autenticado para Edge Functions de Supabase
 */
export async function authenticatedEdgeFetch(
  functionName: string,
  options: { method?: string; body?: object } = {}
): Promise<Response> {
  const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
  const url = `${edgeFunctionsUrl}/functions/v1/${functionName}`;
  
  return authenticatedFetch(url, {
    method: options.method || 'POST',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export default authenticatedFetch;
