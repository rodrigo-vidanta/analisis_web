-- ============================================
-- ACTUALIZAR FUNCIÓN authenticate_user
-- Hacer comparación de email case-insensitive
-- Base: System UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN) AS $$
DECLARE
    user_record RECORD;
    normalized_email TEXT;
BEGIN
    -- Normalizar email a minúsculas para comparación case-insensitive
    normalized_email := LOWER(TRIM(user_email));
    
    -- Buscar usuario por email (comparación case-insensitive)
    SELECT id, password_hash, is_active, failed_login_attempts, locked_until
    INTO user_record
    FROM auth_users 
    WHERE LOWER(TRIM(email)) = normalized_email;
    
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
  RAISE NOTICE '✅ Función authenticate_user actualizada para comparación case-insensitive';
  RAISE NOTICE '   - Email normalizado a minúsculas antes de comparar';
  RAISE NOTICE '   - Comparación usando LOWER(TRIM(email)) = LOWER(TRIM(user_email))';
END $$;

