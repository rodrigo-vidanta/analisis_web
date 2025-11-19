-- ============================================
-- CREAR FUNCIONES RPC DE AUTENTICACIÓN EN SYSTEM_UI
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- 
-- Este script crea las funciones RPC necesarias para autenticación
-- que son usadas por authService.ts
-- ============================================

-- ============================================
-- FUNCIÓN 1: verify_password (helper para verificar contraseñas bcrypt)
-- ============================================
CREATE OR REPLACE FUNCTION verify_password(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Usar la extensión pgcrypto para verificar contraseñas bcrypt
  -- La función crypt de pgcrypto puede verificar contraseñas bcrypt
  RETURN hashed_password = crypt(plain_password, hashed_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 2: authenticate_user (autenticar usuario)
-- ============================================
CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Buscar usuario por email
    SELECT id, password_hash, is_active, failed_login_attempts, locked_until
    INTO user_record
    FROM auth_users 
    WHERE email = user_email;
    
    -- Verificar si el usuario existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Verificar si el usuario está activo
    IF NOT user_record.is_active THEN
        RETURN QUERY SELECT NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Verificar si la cuenta está bloqueada
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN QUERY SELECT NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Verificar contraseña usando verify_password
    IF verify_password(user_password, user_record.password_hash) THEN
        -- Contraseña correcta: limpiar intentos fallidos
        UPDATE auth_users 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT user_record.id, TRUE;
    ELSE
        -- Contraseña incorrecta: incrementar intentos fallidos
        UPDATE auth_users 
        SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
            locked_until = CASE 
                WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL 
            END
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT NULL::UUID, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de autenticación creadas en System_UI';
  RAISE NOTICE '   - verify_password';
  RAISE NOTICE '   - authenticate_user';
END $$;

