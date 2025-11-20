-- ============================================
-- AGREGAR CAMPO is_operativo A TABLA auth_users
-- Base: zbylezfyagwrxoecioup.supabase.co (System_UI)
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- Agregar columna is_operativo si no existe
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS is_operativo BOOLEAN DEFAULT true;

-- Comentario de la columna
COMMENT ON COLUMN auth_users.is_operativo IS 'Estado lógico operativo/no operativo. No limita acceso ni permisos, solo es un estado lógico. Por defecto true.';

-- Actualizar usuarios existentes para que sean operativos por defecto
UPDATE auth_users 
SET is_operativo = true 
WHERE is_operativo IS NULL;

-- Crear índice para mejorar rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_auth_users_is_operativo ON auth_users(is_operativo);

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'auth_users' 
AND column_name = 'is_operativo';

