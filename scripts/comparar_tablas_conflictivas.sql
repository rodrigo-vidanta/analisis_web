-- Script para comparar estructuras de tablas conflictivas
-- Ejecutar en ambas bases de datos para comparar

-- ============================================
-- 1. COMPARAR admin_messages
-- ============================================

-- En system_ui:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_messages'
ORDER BY ordinal_position;

-- En pqnc_ai:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_messages'
ORDER BY ordinal_position;

-- ============================================
-- 2. COMPARAR api_auth_tokens
-- ============================================

-- Columnas en system_ui que NO están en pqnc_ai:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_auth_tokens'
  AND column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'api_auth_tokens'
      -- Ejecutar esta parte en pqnc_ai para comparar
  )
ORDER BY ordinal_position;

-- Columnas en pqnc_ai que NO están en system_ui:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_auth_tokens'
  AND column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'api_auth_tokens'
      -- Ejecutar esta parte en system_ui para comparar
  )
ORDER BY ordinal_position;

-- ============================================
-- 3. COMPARAR api_auth_tokens_history
-- ============================================

-- Columnas en system_ui que NO están en pqnc_ai:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_auth_tokens_history'
ORDER BY ordinal_position;

-- Columnas en pqnc_ai que NO están en system_ui:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_auth_tokens_history'
ORDER BY ordinal_position;

-- ============================================
-- 4. COMPARAR content_moderation_warnings
-- ============================================

-- En system_ui:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'content_moderation_warnings'
ORDER BY ordinal_position;

-- En pqnc_ai:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'content_moderation_warnings'
ORDER BY ordinal_position;

-- ============================================
-- 5. COMPARAR user_notifications (CRÍTICO)
-- ============================================

-- Estructura completa en system_ui:
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
ORDER BY ordinal_position;

-- Estructura completa en pqnc_ai:
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
ORDER BY ordinal_position;

-- ============================================
-- 6. CONTAR REGISTROS EN TABLAS CONFLICTIVAS
-- ============================================

-- En system_ui:
SELECT 
    'admin_messages' as tabla, COUNT(*) as registros FROM admin_messages
UNION ALL
SELECT 'api_auth_tokens', COUNT(*) FROM api_auth_tokens
UNION ALL
SELECT 'api_auth_tokens_history', COUNT(*) FROM api_auth_tokens_history
UNION ALL
SELECT 'content_moderation_warnings', COUNT(*) FROM content_moderation_warnings
UNION ALL
SELECT 'user_notifications', COUNT(*) FROM user_notifications;

-- En pqnc_ai:
SELECT 
    'admin_messages' as tabla, COUNT(*) as registros FROM admin_messages
UNION ALL
SELECT 'api_auth_tokens', COUNT(*) FROM api_auth_tokens
UNION ALL
SELECT 'api_auth_tokens_history', COUNT(*) FROM api_auth_tokens_history
UNION ALL
SELECT 'content_moderation_warnings', COUNT(*) FROM content_moderation_warnings
UNION ALL
SELECT 'user_notifications', COUNT(*) FROM user_notifications;

-- ============================================
-- 7. VERIFICAR CONSTRAINTS Y ÍNDICES
-- ============================================

-- Constraints en system_ui:
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN (
    'admin_messages',
    'api_auth_tokens',
    'api_auth_tokens_history',
    'content_moderation_warnings',
    'user_notifications'
  )
ORDER BY tc.table_name, tc.constraint_type;

-- Índices en system_ui:
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN (
    'admin_messages',
    'api_auth_tokens',
    'api_auth_tokens_history',
    'content_moderation_warnings',
    'user_notifications'
  )
ORDER BY tablename, indexname;
