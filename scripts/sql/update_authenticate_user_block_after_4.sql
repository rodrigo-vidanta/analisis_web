-- ============================================
-- ACTUALIZAR FUNCIÓN authenticate_user
-- Bloquear después de 4 intentos fallidos (no 5)
-- Base: System UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN, account_locked BOOLEAN, failed_attempts INTEGER, locked_until TIMESTAMP WITH TIME ZONE) AS $$
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
        RETURN QUERY SELECT NULL::UUID, FALSE, FALSE, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Verificar si el usuario está activo
    IF NOT user_record.is_active THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, FALSE, COALESCE(user_record.failed_login_attempts, 0), user_record.locked_until;
        RETURN;
    END IF;
    
    -- Verificar si la cuenta está bloqueada
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN QUERY SELECT user_record.id, FALSE, TRUE, COALESCE(user_record.failed_login_attempts, 0), user_record.locked_until;
        RETURN;
    END IF;
    
    -- Si estaba bloqueado pero ya pasó el tiempo, desbloquear
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until <= NOW() THEN
        UPDATE auth_users 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = user_record.id;
    END IF;
    
    -- Verificar contraseña
    IF verify_password(user_password, user_record.password_hash) THEN
        -- Contraseña correcta: limpiar intentos fallidos
        UPDATE auth_users 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT user_record.id, TRUE, FALSE, 0, NULL::TIMESTAMP WITH TIME ZONE;
    ELSE
        -- Contraseña incorrecta: incrementar intentos fallidos
        UPDATE auth_users 
        SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
            locked_until = CASE 
                WHEN COALESCE(failed_login_attempts, 0) + 1 >= 4 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL 
            END
        WHERE id = user_record.id;
        
        -- Obtener el nuevo estado después del update
        SELECT failed_login_attempts, locked_until INTO user_record
        FROM auth_users WHERE id = user_record.id;
        
        RETURN QUERY SELECT NULL::UUID, FALSE, 
            CASE WHEN user_record.locked_until IS NOT NULL THEN TRUE ELSE FALSE END,
            COALESCE(user_record.failed_login_attempts, 0),
            user_record.locked_until;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION authenticate_user IS 'Autentica usuario y bloquea después de 4 intentos fallidos. Retorna información de bloqueo.';

