-- ============================================
-- AÑADIR CAMPOS A auth_users
-- Base de datos: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Propósito: Añadir campos id_colaborador, id_dynamics y must_change_password
-- ============================================

-- Añadir campo id_colaborador
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS id_colaborador VARCHAR(50);

-- Añadir campo id_dynamics
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS id_dynamics VARCHAR(255);

-- Añadir campo must_change_password para detectar primer inicio de sesión
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_auth_users_id_colaborador 
ON auth_users(id_colaborador);

CREATE INDEX IF NOT EXISTS idx_auth_users_id_dynamics 
ON auth_users(id_dynamics);

-- Comentarios para documentación
COMMENT ON COLUMN auth_users.id_colaborador IS 'ID del colaborador en el sistema externo';
COMMENT ON COLUMN auth_users.id_dynamics IS 'ID de Dynamics CRM';
COMMENT ON COLUMN auth_users.must_change_password IS 'Indica si el usuario debe cambiar su contraseña en el próximo inicio de sesión';

