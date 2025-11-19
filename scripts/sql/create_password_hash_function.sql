-- ============================================
-- FUNCIÓN PARA HASH DE CONTRASEÑAS
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

-- Habilitar extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función para generar hash de contraseña
CREATE OR REPLACE FUNCTION hash_password(password_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hash_password IS 'Genera un hash bcrypt de una contraseña usando pgcrypto';

-- Función para verificar contraseña
CREATE OR REPLACE FUNCTION verify_password(password_text TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password_text, password_hash);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION verify_password IS 'Verifica una contraseña contra su hash usando pgcrypto';

-- Actualizar usuarios de prueba con contraseñas hash correctas
UPDATE auth_users
SET password_hash = hash_password('Admin$2025')
WHERE email LIKE 'coordinador_%' OR email LIKE 'ejecutivo%';

