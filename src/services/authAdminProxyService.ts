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

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Metadata de usuario que se puede actualizar en auth.users
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export interface UserMetadataUpdate {
  // Información básica
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  department?: string;
  position?: string;
  
  // Coordinaciones y asignaciones
  coordinacion_id?: string | null;
  id_dynamics?: string | null;
  
  // Estados y flags
  is_operativo?: boolean;
  is_active?: boolean;
  is_coordinator?: boolean;
  is_ejecutivo?: boolean;
  archivado?: boolean;
  inbound?: boolean;
  
  // Sistema de backup
  backup_id?: string | null;
  has_backup?: boolean;
  telefono_original?: string | null;
  
  // Seguridad y autenticación
  failed_login_attempts?: number;
  locked_until?: string | null;
  last_login?: string;
  
  // Permisos y roles
  role_id?: string;
  
  // Auditoría
  updated_at?: string;
  updated_by?: string;
}

/**
 * Respuesta de la Edge Function auth-admin-proxy
 */
interface ProxyResponse<T = any> {
  data?: T;
  success?: boolean;
  error?: string;
  warning?: string;
}

/**
 * Parámetros para crear un nuevo usuario
 */
export interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
  phone?: string | null;
  isActive?: boolean;
  isCoordinator?: boolean;
  isEjecutivo?: boolean;
  coordinacionId?: string | null;
  department?: string;
  position?: string;
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
 * @param userId - UUID del usuario
 * @param metadata - Campos a actualizar (typed con UserMetadataUpdate)
 * @returns Promise<boolean> - true si se actualizó correctamente
 */
export async function updateUserMetadata(
  userId: string, 
  metadata: UserMetadataUpdate
): Promise<boolean> {
  const result = await callAuthAdminProxy('updateUserMetadata', { userId, metadata });
  return result.success === true;
}

/**
 * Actualiza campos de un usuario (alias de updateUserMetadata para compatibilidad)
 * @deprecated Usar updateUserMetadata en su lugar
 */
export async function updateUserField(
  userId: string, 
  updates: UserMetadataUpdate
): Promise<boolean> {
  return updateUserMetadata(userId, updates);
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

/**
 * Actualiza el estado is_operativo de un usuario
 */
export async function updateIsOperativo(userId: string, isOperativo: boolean): Promise<boolean> {
  const result = await callAuthAdminProxy('updateIsOperativo', { userId, isOperativo });
  return result.success === true;
}

/**
 * Resetea los intentos fallidos de login
 */
export async function resetFailedAttempts(userId: string): Promise<boolean> {
  const result = await callAuthAdminProxy('resetFailedAttempts', { userId });
  return result.success === true;
}

// Export del servicio completo
export const authAdminProxyService = {
  updateLastLogin,
  logLogin,
  getUserById,
  updateUserField, // Mantener para compatibilidad
  updateUserMetadata, // Nueva función con types
  getExecutivesWithBackup,
  validateSession,
  updateIsOperativo,
  resetFailedAttempts
};

export default authAdminProxyService;
