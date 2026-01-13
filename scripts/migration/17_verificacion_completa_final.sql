-- ============================================
-- VERIFICACIÓN COMPLETA DE MIGRACIÓN
-- ============================================
-- 
-- Este script realiza una verificación exhaustiva de la migración:
-- 1. Comparación de conteos entre system_ui y pqnc_ai
-- 2. Verificación de foreign keys rotas
-- 3. Verificación de duplicados
-- 4. Verificación de valores NULL en campos críticos
-- 5. Verificación de integridad de datos específicos
--
-- ============================================

-- ============================================
-- PASO 1: CREAR FOREIGN TABLES PARA VERIFICACIÓN
-- ============================================

-- Tablas principales de auth
CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_users (
    id uuid, email text, full_name text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_users');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_roles (
    id uuid, name text, display_name text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_roles');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_permissions (
    id uuid, permission_name text, module text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_permissions');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_sessions (
    id uuid, user_id uuid, session_token text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_sessions');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_coordinaciones (
    id uuid, codigo text, nombre text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'coordinaciones');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_permission_groups (
    id uuid, name text, display_name text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'permission_groups');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_group_permissions (
    id uuid, group_id uuid, module text, action text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'group_permissions');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_user_permission_groups (
    id uuid, user_id uuid, group_id uuid, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'user_permission_groups');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_user_coordinaciones (
    id uuid, user_id uuid, coordinacion_id uuid, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_user_coordinaciones');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_user_permissions (
    id uuid, user_id uuid, permission_name text, module text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_user_permissions');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_auth_role_permissions (
    id uuid, role_id uuid, permission_id uuid, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'auth_role_permissions');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_user_notifications_legacy (
    id uuid, user_id uuid, notification_type text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'user_notifications');

-- Tablas adicionales
CREATE FOREIGN TABLE IF NOT EXISTS system_ui_api_auth_tokens_history (
    id uuid, token_id uuid, token_key text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'api_auth_tokens_history');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_user_avatars (
    id uuid, user_id uuid, avatar_url text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'user_avatars');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_user_warning_counters (
    user_id uuid, total_warnings integer, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'user_warning_counters');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_coordinador_coordinaciones_legacy (
    id uuid, coordinador_id uuid, coordinacion_id uuid, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'coordinador_coordinaciones_legacy');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_timeline_activities (
    id uuid, user_id uuid, title text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'timeline_activities');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_whatsapp_labels_custom (
    id uuid, user_id uuid, name text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'whatsapp_labels_custom');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_group_audit_log (
    id uuid, entity_type text, user_id uuid, action text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'group_audit_log');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_uchat_bots (
    id uuid, bot_name text, is_active boolean, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'uchat_bots');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_whatsapp_labels_preset (
    id uuid, name text, color text, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'whatsapp_labels_preset');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_coordinacion_statistics (
    id uuid, coordinacion_id uuid, ejecutivo_id uuid, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'coordinacion_statistics');

CREATE FOREIGN TABLE IF NOT EXISTS system_ui_log_server_config (
    id uuid, webhook_url text, enabled boolean, created_at timestamptz
) SERVER system_ui_server OPTIONS (schema_name 'public', table_name 'log_server_config');

-- ============================================
-- PASO 2: COMPARACIÓN DE CONTEOS POR TABLA
-- ============================================

SELECT 
    '=== COMPARACIÓN DE CONTEOS ===' as verificacion,
    '' as tabla,
    '' as system_ui_count,
    '' as pqnc_ai_count,
    '' as diferencia,
    '' as estado
WHERE false

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'admin_messages' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_admin_messages) as system_ui_count,
    (SELECT COUNT(*)::text FROM admin_messages) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_admin_messages) - (SELECT COUNT(*) FROM admin_messages))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_admin_messages) = (SELECT COUNT(*) FROM admin_messages) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'content_moderation_warnings' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_content_moderation_warnings) as system_ui_count,
    (SELECT COUNT(*)::text FROM content_moderation_warnings) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_content_moderation_warnings) - (SELECT COUNT(*) FROM content_moderation_warnings))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_content_moderation_warnings) = (SELECT COUNT(*) FROM content_moderation_warnings) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'api_auth_tokens' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_api_auth_tokens) as system_ui_count,
    (SELECT COUNT(*)::text FROM api_auth_tokens) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_api_auth_tokens) - (SELECT COUNT(*) FROM api_auth_tokens))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_api_auth_tokens) = (SELECT COUNT(*) FROM api_auth_tokens) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'api_auth_tokens_history' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_api_auth_tokens_history) as system_ui_count,
    (SELECT COUNT(*)::text FROM api_auth_tokens_history) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_api_auth_tokens_history) - (SELECT COUNT(*) FROM api_auth_tokens_history))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_api_auth_tokens_history) = (SELECT COUNT(*) FROM api_auth_tokens_history) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_users' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_users) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_users) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_users) - (SELECT COUNT(*) FROM auth_users))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_users) = (SELECT COUNT(*) FROM auth_users) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_roles' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_roles) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_roles) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_roles) - (SELECT COUNT(*) FROM auth_roles))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_roles) = (SELECT COUNT(*) FROM auth_roles) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_permissions' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_permissions) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_permissions) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_permissions) - (SELECT COUNT(*) FROM auth_permissions))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_permissions) = (SELECT COUNT(*) FROM auth_permissions) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_sessions' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_sessions) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_sessions) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_sessions) - (SELECT COUNT(*) FROM auth_sessions))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_sessions) = (SELECT COUNT(*) FROM auth_sessions) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'coordinaciones' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_coordinaciones) as system_ui_count,
    (SELECT COUNT(*)::text FROM coordinaciones) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_coordinaciones) - (SELECT COUNT(*) FROM coordinaciones))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_coordinaciones) = (SELECT COUNT(*) FROM coordinaciones) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'permission_groups' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_permission_groups) as system_ui_count,
    (SELECT COUNT(*)::text FROM permission_groups) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_permission_groups) - (SELECT COUNT(*) FROM permission_groups))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_permission_groups) = (SELECT COUNT(*) FROM permission_groups) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'group_permissions' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_group_permissions) as system_ui_count,
    (SELECT COUNT(*)::text FROM group_permissions) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_group_permissions) - (SELECT COUNT(*) FROM group_permissions))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_group_permissions) = (SELECT COUNT(*) FROM group_permissions) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'user_permission_groups' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_user_permission_groups) as system_ui_count,
    (SELECT COUNT(*)::text FROM user_permission_groups) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_user_permission_groups) - (SELECT COUNT(*) FROM user_permission_groups))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_user_permission_groups) = (SELECT COUNT(*) FROM user_permission_groups) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_user_coordinaciones' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_user_coordinaciones) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_user_coordinaciones) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_user_coordinaciones) - (SELECT COUNT(*) FROM auth_user_coordinaciones))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_user_coordinaciones) = (SELECT COUNT(*) FROM auth_user_coordinaciones) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_user_permissions' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_user_permissions) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_user_permissions) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_user_permissions) - (SELECT COUNT(*) FROM auth_user_permissions))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_user_permissions) = (SELECT COUNT(*) FROM auth_user_permissions) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_role_permissions' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_role_permissions) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_role_permissions) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_role_permissions) - (SELECT COUNT(*) FROM auth_role_permissions))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_role_permissions) = (SELECT COUNT(*) FROM auth_role_permissions) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'user_notifications_legacy' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_user_notifications_legacy) as system_ui_count,
    (SELECT COUNT(*)::text FROM user_notifications_legacy) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_user_notifications_legacy) - (SELECT COUNT(*) FROM user_notifications_legacy))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_user_notifications_legacy) = (SELECT COUNT(*) FROM user_notifications_legacy) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'prospect_assignments' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_prospect_assignments) as system_ui_count,
    (SELECT COUNT(*)::text FROM prospect_assignments) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_prospect_assignments) - (SELECT COUNT(*) FROM prospect_assignments))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_prospect_assignments) = (SELECT COUNT(*) FROM prospect_assignments) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'assignment_logs' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_assignment_logs) as system_ui_count,
    (SELECT COUNT(*)::text FROM assignment_logs) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_assignment_logs) - (SELECT COUNT(*) FROM assignment_logs))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_assignment_logs) = (SELECT COUNT(*) FROM assignment_logs) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'whatsapp_conversation_labels' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_whatsapp_conversation_labels) as system_ui_count,
    (SELECT COUNT(*)::text FROM whatsapp_conversation_labels) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_whatsapp_conversation_labels) - (SELECT COUNT(*) FROM whatsapp_conversation_labels))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_whatsapp_conversation_labels) = (SELECT COUNT(*) FROM whatsapp_conversation_labels) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'paraphrase_logs' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_paraphrase_logs) as system_ui_count,
    (SELECT COUNT(*)::text FROM paraphrase_logs) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_paraphrase_logs) - (SELECT COUNT(*) FROM paraphrase_logs))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_paraphrase_logs) = (SELECT COUNT(*) FROM paraphrase_logs) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'auth_login_logs' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_auth_login_logs) as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_login_logs) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_auth_login_logs) - (SELECT COUNT(*) FROM auth_login_logs))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_auth_login_logs) = (SELECT COUNT(*) FROM auth_login_logs) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'user_avatars' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_user_avatars) as system_ui_count,
    (SELECT COUNT(*)::text FROM user_avatars) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_user_avatars) - (SELECT COUNT(*) FROM user_avatars))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_user_avatars) = (SELECT COUNT(*) FROM user_avatars) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'user_warning_counters' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_user_warning_counters) as system_ui_count,
    (SELECT COUNT(*)::text FROM user_warning_counters) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_user_warning_counters) - (SELECT COUNT(*) FROM user_warning_counters))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_user_warning_counters) = (SELECT COUNT(*) FROM user_warning_counters) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'coordinador_coordinaciones_legacy' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_coordinador_coordinaciones_legacy) as system_ui_count,
    (SELECT COUNT(*)::text FROM coordinador_coordinaciones_legacy) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_coordinador_coordinaciones_legacy) - (SELECT COUNT(*) FROM coordinador_coordinaciones_legacy))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_coordinador_coordinaciones_legacy) = (SELECT COUNT(*) FROM coordinador_coordinaciones_legacy) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'timeline_activities' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_timeline_activities) as system_ui_count,
    (SELECT COUNT(*)::text FROM timeline_activities) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_timeline_activities) - (SELECT COUNT(*) FROM timeline_activities))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_timeline_activities) = (SELECT COUNT(*) FROM timeline_activities) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'whatsapp_labels_custom' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_whatsapp_labels_custom) as system_ui_count,
    (SELECT COUNT(*)::text FROM whatsapp_labels_custom) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_whatsapp_labels_custom) - (SELECT COUNT(*) FROM whatsapp_labels_custom))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_whatsapp_labels_custom) = (SELECT COUNT(*) FROM whatsapp_labels_custom) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'group_audit_log' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_group_audit_log) as system_ui_count,
    (SELECT COUNT(*)::text FROM group_audit_log) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_group_audit_log) - (SELECT COUNT(*) FROM group_audit_log))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_group_audit_log) = (SELECT COUNT(*) FROM group_audit_log) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'uchat_bots' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_uchat_bots) as system_ui_count,
    (SELECT COUNT(*)::text FROM uchat_bots) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_uchat_bots) - (SELECT COUNT(*) FROM uchat_bots))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_uchat_bots) = (SELECT COUNT(*) FROM uchat_bots) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'whatsapp_labels_preset' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_whatsapp_labels_preset) as system_ui_count,
    (SELECT COUNT(*)::text FROM whatsapp_labels_preset) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_whatsapp_labels_preset) - (SELECT COUNT(*) FROM whatsapp_labels_preset))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_whatsapp_labels_preset) = (SELECT COUNT(*) FROM whatsapp_labels_preset) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'coordinacion_statistics' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_coordinacion_statistics) as system_ui_count,
    (SELECT COUNT(*)::text FROM coordinacion_statistics) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_coordinacion_statistics) - (SELECT COUNT(*) FROM coordinacion_statistics))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_coordinacion_statistics) = (SELECT COUNT(*) FROM coordinacion_statistics) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado

UNION ALL

SELECT 
    'CONTEOS' as verificacion,
    'log_server_config' as tabla,
    (SELECT COUNT(*)::text FROM system_ui_log_server_config) as system_ui_count,
    (SELECT COUNT(*)::text FROM log_server_config) as pqnc_ai_count,
    ((SELECT COUNT(*) FROM system_ui_log_server_config) - (SELECT COUNT(*) FROM log_server_config))::text as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM system_ui_log_server_config) = (SELECT COUNT(*) FROM log_server_config) THEN '✅ OK'
        ELSE '⚠️ DIFERENCIA'
    END as estado;

-- ============================================
-- PASO 3: VERIFICAR FOREIGN KEYS ROTAS
-- ============================================

SELECT 
    '=== FOREIGN KEYS ROTAS ===' as verificacion,
    '' as tabla,
    '' as system_ui_count,
    '' as pqnc_ai_count,
    '' as diferencia,
    '' as estado
WHERE false

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'auth_user_permissions.user_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_user_permissions aup WHERE aup.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = aup.user_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_user_permissions aup WHERE aup.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = aup.user_id)) = 0 THEN '✅ OK'
        ELSE '❌ FK ROTA'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'auth_user_coordinaciones.user_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_user_coordinaciones auc WHERE auc.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = auc.user_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_user_coordinaciones auc WHERE auc.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = auc.user_id)) = 0 THEN '✅ OK'
        ELSE '❌ FK ROTA'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'auth_user_coordinaciones.assigned_by' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_user_coordinaciones auc WHERE auc.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = auc.assigned_by)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_user_coordinaciones auc WHERE auc.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = auc.assigned_by)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'prospect_assignments.ejecutivo_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM prospect_assignments pa WHERE pa.ejecutivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pa.ejecutivo_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM prospect_assignments pa WHERE pa.ejecutivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pa.ejecutivo_id)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'prospect_assignments.assigned_by' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM prospect_assignments pa WHERE pa.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pa.assigned_by)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM prospect_assignments pa WHERE pa.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pa.assigned_by)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'assignment_logs.ejecutivo_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM assignment_logs al WHERE al.ejecutivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = al.ejecutivo_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM assignment_logs al WHERE al.ejecutivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = al.ejecutivo_id)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'assignment_logs.assigned_by' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM assignment_logs al WHERE al.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = al.assigned_by)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM assignment_logs al WHERE al.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = al.assigned_by)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'whatsapp_conversation_labels.added_by' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM whatsapp_conversation_labels wcl WHERE wcl.added_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = wcl.added_by)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM whatsapp_conversation_labels wcl WHERE wcl.added_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = wcl.added_by)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'paraphrase_logs.user_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM paraphrase_logs pl WHERE pl.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pl.user_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM paraphrase_logs pl WHERE pl.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pl.user_id)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'auth_login_logs.user_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_login_logs all WHERE all.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = all.user_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_login_logs all WHERE all.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = all.user_id)) = 0 THEN '✅ OK'
        ELSE '⚠️ FK NULL (esperado)'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'user_permission_groups.user_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM user_permission_groups upg WHERE upg.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = upg.user_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_permission_groups upg WHERE upg.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = upg.user_id)) = 0 THEN '✅ OK'
        ELSE '❌ FK ROTA'
    END as estado

UNION ALL

SELECT 
    'FOREIGN KEYS' as verificacion,
    'user_permission_groups.group_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM user_permission_groups upg WHERE upg.group_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM permission_groups WHERE id = upg.group_id)) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_permission_groups upg WHERE upg.group_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM permission_groups WHERE id = upg.group_id)) = 0 THEN '✅ OK'
        ELSE '❌ FK ROTA'
    END as estado;

-- ============================================
-- PASO 4: VERIFICAR DUPLICADOS
-- ============================================

SELECT 
    '=== DUPLICADOS ===' as verificacion,
    'admin_messages' as tabla,
    '' as system_ui_count,
    (SELECT (COUNT(*) - COUNT(DISTINCT id))::text FROM admin_messages) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) - COUNT(DISTINCT id) FROM admin_messages) = 0 THEN '✅ OK'
        ELSE '❌ DUPLICADOS'
    END as estado

UNION ALL

SELECT 
    'DUPLICADOS' as verificacion,
    'auth_users' as tabla,
    '' as system_ui_count,
    (SELECT (COUNT(*) - COUNT(DISTINCT id))::text FROM auth_users) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) - COUNT(DISTINCT id) FROM auth_users) = 0 THEN '✅ OK'
        ELSE '❌ DUPLICADOS'
    END as estado

UNION ALL

SELECT 
    'DUPLICADOS' as verificacion,
    'api_auth_tokens' as tabla,
    '' as system_ui_count,
    (SELECT (COUNT(*) - COUNT(DISTINCT id))::text FROM api_auth_tokens) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) - COUNT(DISTINCT id) FROM api_auth_tokens) = 0 THEN '✅ OK'
        ELSE '❌ DUPLICADOS'
    END as estado;

-- ============================================
-- PASO 5: VERIFICAR VALORES NULL EN CAMPOS CRÍTICOS
-- ============================================

SELECT 
    '=== VALORES NULL CRÍTICOS ===' as verificacion,
    'auth_users.email' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_users WHERE email IS NULL) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_users WHERE email IS NULL) = 0 THEN '✅ OK'
        ELSE '❌ NULL ENCONTRADO'
    END as estado

UNION ALL

SELECT 
    'NULL CRÍTICOS' as verificacion,
    'auth_users.created_at' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_users WHERE created_at IS NULL) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_users WHERE created_at IS NULL) = 0 THEN '✅ OK'
        ELSE '⚠️ NULL ENCONTRADO'
    END as estado

UNION ALL

SELECT 
    'NULL CRÍTICOS' as verificacion,
    'auth_sessions.user_id' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM auth_sessions WHERE user_id IS NULL) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth_sessions WHERE user_id IS NULL) = 0 THEN '✅ OK'
        ELSE '❌ NULL ENCONTRADO'
    END as estado;

-- ============================================
-- PASO 6: VERIFICAR INTEGRIDAD DE DATOS ESPECÍFICOS
-- ============================================

SELECT 
    '=== INTEGRIDAD ESPECÍFICA ===' as verificacion,
    'api_auth_tokens con credential_key' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM api_auth_tokens WHERE credential_key IS NOT NULL) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM api_auth_tokens WHERE credential_key IS NOT NULL) > 0 THEN '✅ OK'
        ELSE '⚠️ SIN COLUMNA'
    END as estado

UNION ALL

SELECT 
    'INTEGRIDAD' as verificacion,
    'user_notifications_legacy migradas' as tabla,
    '' as system_ui_count,
    (SELECT COUNT(*)::text FROM user_notifications_legacy) as pqnc_ai_count,
    '' as diferencia,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_notifications_legacy) > 0 THEN '✅ OK'
        ELSE '⚠️ VACÍA'
    END as estado;
