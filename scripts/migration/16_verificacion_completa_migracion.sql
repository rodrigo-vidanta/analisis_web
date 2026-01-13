-- ============================================
-- VERIFICACIÓN COMPLETA DE MIGRACIÓN
-- ============================================
-- 
-- Este script verifica:
-- 1. Conteo de registros por tabla
-- 2. Integridad de foreign keys
-- 3. Duplicados
-- 4. Valores NULL en campos críticos
-- 5. Comparación entre system_ui y pqnc_ai
--
-- ============================================

-- ============================================
-- 1. VERIFICAR FOREIGN TABLES DISPONIBLES
-- ============================================

SELECT 
    'Foreign Tables Disponibles' as seccion,
    srvname as server_name,
    ft.ftname as foreign_table_name
FROM pg_foreign_table ft
JOIN pg_foreign_server fs ON ft.ftserver = fs.oid
WHERE fs.srvname = 'system_ui_server'
ORDER BY ft.ftname;

-- ============================================
-- 2. COMPARACIÓN DE CONTEOS POR TABLA
-- ============================================

-- Tablas migradas desde system_ui
WITH tablas_migradas AS (
    SELECT 'admin_messages' as tabla UNION ALL
    SELECT 'content_moderation_warnings' UNION ALL
    SELECT 'api_auth_tokens' UNION ALL
    SELECT 'api_auth_tokens_history' UNION ALL
    SELECT 'user_notifications_legacy' UNION ALL
    SELECT 'auth_roles' UNION ALL
    SELECT 'auth_users' UNION ALL
    SELECT 'auth_permissions' UNION ALL
    SELECT 'auth_role_permissions' UNION ALL
    SELECT 'auth_user_permissions' UNION ALL
    SELECT 'auth_sessions' UNION ALL
    SELECT 'coordinaciones' UNION ALL
    SELECT 'auth_user_coordinaciones' UNION ALL
    SELECT 'auth_login_logs' UNION ALL
    SELECT 'permission_groups' UNION ALL
    SELECT 'group_permissions' UNION ALL
    SELECT 'log_server_config' UNION ALL
    SELECT 'coordinacion_statistics' UNION ALL
    SELECT 'uchat_bots' UNION ALL
    SELECT 'whatsapp_labels_preset' UNION ALL
    SELECT 'user_avatars' UNION ALL
    SELECT 'user_warning_counters' UNION ALL
    SELECT 'coordinador_coordinaciones_legacy' UNION ALL
    SELECT 'timeline_activities' UNION ALL
    SELECT 'whatsapp_labels_custom' UNION ALL
    SELECT 'group_audit_log' UNION ALL
    SELECT 'prospect_assignments' UNION ALL
    SELECT 'assignment_logs' UNION ALL
    SELECT 'whatsapp_conversation_labels' UNION ALL
    SELECT 'paraphrase_logs' UNION ALL
    SELECT 'user_permission_groups'
)
SELECT 
    tm.tabla,
    (SELECT COUNT(*) FROM system_ui_admin_messages) as system_ui_count,
    (SELECT COUNT(*) FROM admin_messages) as pqnc_ai_count,
    CASE 
        WHEN tm.tabla = 'admin_messages' THEN
            (SELECT COUNT(*) FROM system_ui_admin_messages) - (SELECT COUNT(*) FROM admin_messages)
        ELSE NULL
    END as diferencia
FROM tablas_migradas tm
WHERE tm.tabla = 'admin_messages'

UNION ALL

SELECT 
    'content_moderation_warnings' as tabla,
    (SELECT COUNT(*) FROM system_ui_content_moderation_warnings) as system_ui_count,
    (SELECT COUNT(*) FROM content_moderation_warnings) as pqnc_ai_count,
    (SELECT COUNT(*) FROM system_ui_content_moderation_warnings) - (SELECT COUNT(*) FROM content_moderation_warnings) as diferencia

-- Continuar con todas las tablas...

-- ============================================
-- 3. VERIFICAR FOREIGN KEYS ROTAS
-- ============================================

-- auth_users referenciados en otras tablas
SELECT 
    'auth_user_permissions' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM auth_user_permissions aup
WHERE aup.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = aup.user_id)

UNION ALL

SELECT 
    'auth_user_coordinaciones' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM auth_user_coordinaciones auc
WHERE auc.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = auc.user_id)
  OR auc.assigned_by IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = auc.assigned_by)

UNION ALL

SELECT 
    'prospect_assignments' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM prospect_assignments pa
WHERE (pa.ejecutivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pa.ejecutivo_id))
   OR (pa.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pa.assigned_by))

UNION ALL

SELECT 
    'assignment_logs' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM assignment_logs al
WHERE (al.ejecutivo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = al.ejecutivo_id))
   OR (al.assigned_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = al.assigned_by))

UNION ALL

SELECT 
    'whatsapp_conversation_labels' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM whatsapp_conversation_labels wcl
WHERE wcl.added_by IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = wcl.added_by)

UNION ALL

SELECT 
    'paraphrase_logs' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM paraphrase_logs pl
WHERE pl.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = pl.user_id)

UNION ALL

SELECT 
    'auth_login_logs' as tabla,
    COUNT(*) as registros_con_fk_rota
FROM auth_login_logs all
WHERE all.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth_users WHERE id = all.user_id);

-- ============================================
-- 4. VERIFICAR DUPLICADOS
-- ============================================

SELECT 
    'admin_messages' as tabla,
    COUNT(*) - COUNT(DISTINCT id) as duplicados_por_id
FROM admin_messages

UNION ALL

SELECT 
    'auth_users' as tabla,
    COUNT(*) - COUNT(DISTINCT id) as duplicados_por_id
FROM auth_users

UNION ALL

SELECT 
    'api_auth_tokens' as tabla,
    COUNT(*) - COUNT(DISTINCT id) as duplicados_por_id
FROM api_auth_tokens;

-- ============================================
-- 5. VERIFICAR VALORES NULL EN CAMPOS CRÍTICOS
-- ============================================

SELECT 
    'auth_users' as tabla,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE email IS NULL) as email_null,
    COUNT(*) FILTER (WHERE created_at IS NULL) as created_at_null
FROM auth_users

UNION ALL

SELECT 
    'auth_sessions' as tabla,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE user_id IS NULL) as user_id_null,
    COUNT(*) FILTER (WHERE created_at IS NULL) as created_at_null
FROM auth_sessions;

-- ============================================
-- 6. VERIFICAR INTEGRIDAD DE DATOS ESPECÍFICOS
-- ============================================

-- Verificar que los tokens migrados tienen las columnas nuevas
SELECT 
    COUNT(*) as total_tokens,
    COUNT(*) FILTER (WHERE credential_key IS NOT NULL) as con_credential_key,
    COUNT(*) FILTER (WHERE description IS NOT NULL) as con_description
FROM api_auth_tokens;

-- Verificar que user_notifications_legacy tiene datos
SELECT 
    COUNT(*) as total_notifications_legacy,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as con_user_id,
    COUNT(*) FILTER (WHERE read_at IS NOT NULL) as leidas
FROM user_notifications_legacy;
