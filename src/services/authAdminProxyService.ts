/**
 * ============================================
 * AUTH ADMIN PROXY SERVICE
 * ============================================
 * 
 * Servicio para operaciones admin de autenticación
 * Usa Edge Function auth-admin-proxy para evitar
 * exponer service_role_key en el frontend
 * 
 * @author PQNC AI Platform
 * @date 15 Enero 2026
 */

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const EDGE_FUNCTIONS_ANON_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY || import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '';

interface ProxyResponse<T = any> {
  data?: T;
  success?: boolean;
  error?: string;
  warning?: string;
}

/**
 * Llama a la Edge Function auth-admin-proxy
 */
async function callAuthAdminProxy<T = any>(
  operation: string, 
  params: Record<string, any>
): Promise<ProxyResponse<T>> {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/auth-admin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`,
      },
      body: JSON.stringify({ operation, params })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[authAdminProxyService] Error en ${operation}:`, data.error);
      return { error: data.error || 'Error en Edge Function' };
    }

    return data;
  } catch (error) {
    console.error(`[authAdminProxyService] Error llamando ${operation}:`, error);
    return { error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

// ============================================
// OPERACIONES EXPORTADAS
// ============================================

/**
 * Actualiza el último login de un usuario
 */
export async function updateLastLogin(userId: string): Promise<boolean> {
  const result = await callAuthAdminProxy('updateLastLogin', { userId });
  return result.success === true;
}

/**
 * Registra un intento de login
 */
export async function logLogin(params: {
  userId?: string;
  success: boolean;
  userAgent?: string;
  ip?: string;
  failureReason?: string;
}): Promise<boolean> {
  const result = await callAuthAdminProxy('logLogin', params);
  return !result.error;
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(userId: string, select?: string): Promise<any | null> {
  const result = await callAuthAdminProxy('getUserById', { userId, select });
  return result.data || null;
}

/**
 * Actualiza campos de un usuario (solo campos permitidos)
 */
export async function updateUserField(
  userId: string, 
  updates: Record<string, any>
): Promise<boolean> {
  const result = await callAuthAdminProxy('updateUserField', { userId, updates });
  return result.success === true;
}

/**
 * Obtiene ejecutivos con información de backup
 */
export async function getExecutivesWithBackup(
  roleIds?: string[], 
  coordinacionId?: string
): Promise<any[]> {
  const result = await callAuthAdminProxy('getExecutivesWithBackup', { roleIds, coordinacionId });
  return result.data || [];
}

/**
 * Valida una sesión
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
  reason?: string;
}> {
  const result = await callAuthAdminProxy('validateSession', { sessionToken });
  return {
    valid: result.valid === true,
    userId: result.userId,
    reason: result.reason
  };
}

// Export del servicio completo
export const authAdminProxyService = {
  updateLastLogin,
  logLogin,
  getUserById,
  updateUserField,
  getExecutivesWithBackup,
  validateSession
};

export default authAdminProxyService;
