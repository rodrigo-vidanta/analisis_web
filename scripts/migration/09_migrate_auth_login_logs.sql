-- Migración completa de auth_login_logs de system_ui a pqnc_ai
-- Ejecutar este script directamente sin cargar datos en contexto
-- Fecha: 2025-01-13

-- Migrar auth_login_logs desde system_ui a pqnc_ai
-- Maneja foreign keys: user_id puede ser NULL si el usuario no existe
-- session_token puede ser NULL si la sesión no existe

INSERT INTO auth_login_logs (
    id, user_id, email, session_token, ip_address, user_agent,
    device_type, browser, browser_version, os, os_version,
    login_status, failure_reason, login_method,
    location_country, location_city, is_suspicious, suspicious_reasons,
    created_at, expires_at, last_activity
)
SELECT
    all_logs.id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth_users au WHERE au.id = all_logs.user_id) 
        THEN all_logs.user_id 
        ELSE NULL 
    END as user_id,
    all_logs.email,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth_sessions asess WHERE asess.session_token = all_logs.session_token) 
        THEN all_logs.session_token 
        ELSE NULL 
    END as session_token,
    all_logs.ip_address,
    all_logs.user_agent,
    all_logs.device_type,
    all_logs.browser,
    all_logs.browser_version,
    all_logs.os,
    all_logs.os_version,
    all_logs.login_status,
    all_logs.failure_reason,
    all_logs.login_method,
    all_logs.location_country,
    all_logs.location_city,
    all_logs.is_suspicious,
    all_logs.suspicious_reasons,
    all_logs.created_at,
    all_logs.expires_at,
    all_logs.last_activity
FROM backup_migration_20250113.auth_login_logs all_logs
ON CONFLICT (id) DO NOTHING;
