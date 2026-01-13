-- ============================================
-- SCRIPT 02: AGREGAR COLUMNAS FALTANTES EN PQNC_AI
-- ============================================
-- Ejecutar en: pqnc_ai (glsmifhkoaifvaegsozd.supabase.co)
-- Fecha: 2025-01-13
-- Propósito: Preparar tablas para merge con system_ui

-- ============================================
-- 1. api_auth_tokens - Agregar columnas faltantes
-- ============================================

DO $$
BEGIN
    -- expires_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE api_auth_tokens 
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Columna expires_at agregada a api_auth_tokens';
    ELSE
        RAISE NOTICE '⚠️ Columna expires_at ya existe en api_auth_tokens';
    END IF;

    -- ip_address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE api_auth_tokens 
        ADD COLUMN ip_address TEXT;
        RAISE NOTICE '✅ Columna ip_address agregada a api_auth_tokens';
    ELSE
        RAISE NOTICE '⚠️ Columna ip_address ya existe en api_auth_tokens';
    END IF;

    -- user_agent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE api_auth_tokens 
        ADD COLUMN user_agent TEXT;
        RAISE NOTICE '✅ Columna user_agent agregada a api_auth_tokens';
    ELSE
        RAISE NOTICE '⚠️ Columna user_agent ya existe en api_auth_tokens';
    END IF;
END $$;

-- ============================================
-- 2. api_auth_tokens_history - Agregar columnas faltantes
-- ============================================

DO $$
BEGIN
    -- is_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens_history' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE api_auth_tokens_history 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Columna is_active agregada a api_auth_tokens_history';
    ELSE
        RAISE NOTICE '⚠️ Columna is_active ya existe en api_auth_tokens_history';
    END IF;

    -- ip_address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens_history' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE api_auth_tokens_history 
        ADD COLUMN ip_address TEXT;
        RAISE NOTICE '✅ Columna ip_address agregada a api_auth_tokens_history';
    ELSE
        RAISE NOTICE '⚠️ Columna ip_address ya existe en api_auth_tokens_history';
    END IF;

    -- user_agent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens_history' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE api_auth_tokens_history 
        ADD COLUMN user_agent TEXT;
        RAISE NOTICE '✅ Columna user_agent agregada a api_auth_tokens_history';
    ELSE
        RAISE NOTICE '⚠️ Columna user_agent ya existe en api_auth_tokens_history';
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN DE COLUMNAS AGREGADAS
-- ============================================

-- Verificar estructura de api_auth_tokens
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_auth_tokens'
ORDER BY ordinal_position;

-- Verificar estructura de api_auth_tokens_history
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_auth_tokens_history'
ORDER BY ordinal_position;

-- Verificar que las columnas nuevas existen
SELECT 
    'api_auth_tokens' as tabla,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_auth_tokens' AND column_name = 'expires_at'
    ) THEN '✅' ELSE '❌' END as expires_at,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_auth_tokens' AND column_name = 'ip_address'
    ) THEN '✅' ELSE '❌' END as ip_address,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_auth_tokens' AND column_name = 'user_agent'
    ) THEN '✅' ELSE '❌' END as user_agent
UNION ALL
SELECT 
    'api_auth_tokens_history',
    'N/A',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_auth_tokens_history' AND column_name = 'ip_address'
    ) THEN '✅' ELSE '❌' END,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_auth_tokens_history' AND column_name = 'user_agent'
    ) THEN '✅' ELSE '❌' END;
