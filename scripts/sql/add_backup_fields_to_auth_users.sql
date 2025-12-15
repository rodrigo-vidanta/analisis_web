-- ============================================
-- AGREGAR CAMPOS DE BACKUP A TABLA auth_users
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Propósito: Sistema de backup para ejecutivos cuando están fuera de oficina
-- ============================================

-- Agregar campo backup_id (ejecutivo asignado como backup)
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS backup_id UUID REFERENCES auth_users(id) ON DELETE SET NULL;

-- Agregar campo telefono_original (para restaurar después del login)
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS telefono_original VARCHAR(50);

-- Agregar campo has_backup (indica si tiene backup asignado actualmente)
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS has_backup BOOLEAN DEFAULT false;

-- Comentarios de las columnas
COMMENT ON COLUMN auth_users.backup_id IS 'ID del ejecutivo asignado como backup cuando este ejecutivo está no operativo';
COMMENT ON COLUMN auth_users.telefono_original IS 'Teléfono original del ejecutivo, se restaura al hacer login';
COMMENT ON COLUMN auth_users.has_backup IS 'Indica si actualmente tiene un backup asignado (true) o no (false)';

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_auth_users_backup_id ON auth_users(backup_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_has_backup ON auth_users(has_backup);

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'auth_users' 
AND column_name IN ('backup_id', 'telefono_original', 'has_backup')
ORDER BY column_name;

