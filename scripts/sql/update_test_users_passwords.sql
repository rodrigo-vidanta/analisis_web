-- ============================================
-- ACTUALIZAR CONTRASEÑAS DE USUARIOS DE PRUEBA
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
--
-- Este script actualiza las contraseñas de los usuarios de prueba
-- con el hash correcto de 'Admin$2025'
-- ============================================

-- Habilitar extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función para generar hash de contraseña (si no existe)
CREATE OR REPLACE FUNCTION hash_password(password_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Actualizar contraseñas de coordinadores
UPDATE auth_users
SET password_hash = hash_password('Admin$2025')
WHERE email IN (
  'coordinador_ven@grupovidanta.com',
  'coordinador_i360@grupovidanta.com',
  'coordinador_mvp@grupovidanta.com',
  'coordinador_cobaca@grupovidanta.com',
  'coordinador_boom@grupovidanta.com'
);

-- Actualizar contraseñas de ejecutivos
UPDATE auth_users
SET password_hash = hash_password('Admin$2025')
WHERE email IN (
  'ejecutivo1_ven@grupovidanta.com',
  'ejecutivo2_ven@grupovidanta.com',
  'ejecutivo1_i360@grupovidanta.com',
  'ejecutivo2_i360@grupovidanta.com',
  'ejecutivo1_mvp@grupovidanta.com',
  'ejecutivo2_mvp@grupovidanta.com',
  'ejecutivo1_cobaca@grupovidanta.com',
  'ejecutivo2_cobaca@grupovidanta.com',
  'ejecutivo1_boom@grupovidanta.com',
  'ejecutivo2_boom@grupovidanta.com'
);

-- Verificar usuarios actualizados
SELECT 
  email,
  full_name,
  CASE 
    WHEN password_hash LIKE '$2a$%' THEN 'Hash actualizado'
    ELSE 'Hash pendiente'
  END as password_status
FROM auth_users
WHERE email LIKE 'coordinador_%' OR email LIKE 'ejecutivo%'
ORDER BY email;

