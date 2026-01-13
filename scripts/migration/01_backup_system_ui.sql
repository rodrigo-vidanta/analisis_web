-- ============================================
-- SCRIPT 01: BACKUP COMPLETO DE SYSTEM_UI
-- ============================================
-- Ejecutar en: system_ui (zbylezfyagwrxoecioup.supabase.co)
-- Fecha: 2025-01-13
-- Propósito: Backup completo antes de migración

-- Crear schema de backup
CREATE SCHEMA IF NOT EXISTS backup_migration_20250113;

-- ============================================
-- BACKUP DE TABLAS CON CONFLICTOS
-- ============================================

CREATE TABLE backup_migration_20250113.user_notifications AS 
SELECT * FROM user_notifications;

CREATE TABLE backup_migration_20250113.api_auth_tokens AS 
SELECT * FROM api_auth_tokens;

CREATE TABLE backup_migration_20250113.api_auth_tokens_history AS 
SELECT * FROM api_auth_tokens_history;

CREATE TABLE backup_migration_20250113.admin_messages AS 
SELECT * FROM admin_messages;

CREATE TABLE backup_migration_20250113.content_moderation_warnings AS 
SELECT * FROM content_moderation_warnings;

-- ============================================
-- BACKUP DE TABLAS DE AUTENTICACIÓN
-- ============================================

CREATE TABLE backup_migration_20250113.auth_users AS 
SELECT * FROM auth_users;

CREATE TABLE backup_migration_20250113.auth_roles AS 
SELECT * FROM auth_roles;

CREATE TABLE backup_migration_20250113.auth_permissions AS 
SELECT * FROM auth_permissions;

CREATE TABLE backup_migration_20250113.auth_role_permissions AS 
SELECT * FROM auth_role_permissions;

CREATE TABLE backup_migration_20250113.auth_user_permissions AS 
SELECT * FROM auth_user_permissions;

CREATE TABLE backup_migration_20250113.auth_sessions AS 
SELECT * FROM auth_sessions;

CREATE TABLE backup_migration_20250113.auth_login_logs AS 
SELECT * FROM auth_login_logs;

CREATE TABLE backup_migration_20250113.auth_user_coordinaciones AS 
SELECT * FROM auth_user_coordinaciones;

-- ============================================
-- BACKUP DE TABLAS DE COORDINACIONES
-- ============================================

CREATE TABLE backup_migration_20250113.coordinaciones AS 
SELECT * FROM coordinaciones;

CREATE TABLE backup_migration_20250113.coordinacion_statistics AS 
SELECT * FROM coordinacion_statistics;

CREATE TABLE backup_migration_20250113.coordinador_coordinaciones_legacy AS 
SELECT * FROM coordinador_coordinaciones_legacy;

-- ============================================
-- BACKUP DE TABLAS DE PERMISOS
-- ============================================

CREATE TABLE backup_migration_20250113.permission_groups AS 
SELECT * FROM permission_groups;

CREATE TABLE backup_migration_20250113.group_permissions AS 
SELECT * FROM group_permissions;

CREATE TABLE backup_migration_20250113.user_permission_groups AS 
SELECT * FROM user_permission_groups;

CREATE TABLE backup_migration_20250113.group_audit_log AS 
SELECT * FROM group_audit_log;

-- ============================================
-- BACKUP DE TABLAS DE ASIGNACIONES
-- ============================================

CREATE TABLE backup_migration_20250113.prospect_assignments AS 
SELECT * FROM prospect_assignments;

CREATE TABLE backup_migration_20250113.prospect_assignment_logs AS 
SELECT * FROM prospect_assignment_logs;

CREATE TABLE backup_migration_20250113.assignment_logs AS 
SELECT * FROM assignment_logs;

-- ============================================
-- BACKUP DE OTRAS TABLAS
-- ============================================

CREATE TABLE backup_migration_20250113.api_tokens AS 
SELECT * FROM api_tokens;

CREATE TABLE backup_migration_20250113.log_server_config AS 
SELECT * FROM log_server_config;

CREATE TABLE backup_migration_20250113.aws_diagram_configs AS 
SELECT * FROM aws_diagram_configs;

CREATE TABLE backup_migration_20250113.bot_pause_status AS 
SELECT * FROM bot_pause_status;

CREATE TABLE backup_migration_20250113.uchat_bots AS 
SELECT * FROM uchat_bots;

CREATE TABLE backup_migration_20250113.uchat_conversations AS 
SELECT * FROM uchat_conversations;

CREATE TABLE backup_migration_20250113.uchat_messages AS 
SELECT * FROM uchat_messages;

CREATE TABLE backup_migration_20250113.user_avatars AS 
SELECT * FROM user_avatars;

CREATE TABLE backup_migration_20250113.user_warning_counters AS 
SELECT * FROM user_warning_counters;

CREATE TABLE backup_migration_20250113.paraphrase_logs AS 
SELECT * FROM paraphrase_logs;

CREATE TABLE backup_migration_20250113.timeline_activities AS 
SELECT * FROM timeline_activities;

CREATE TABLE backup_migration_20250113.whatsapp_conversation_labels AS 
SELECT * FROM whatsapp_conversation_labels;

CREATE TABLE backup_migration_20250113.whatsapp_labels_custom AS 
SELECT * FROM whatsapp_labels_custom;

CREATE TABLE backup_migration_20250113.whatsapp_labels_preset AS 
SELECT * FROM whatsapp_labels_preset;

-- ============================================
-- VERIFICACIÓN DE BACKUP
-- ============================================

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'backup_migration_20250113'
ORDER BY tablename;

-- Contar registros en cada tabla de backup
SELECT 
    'user_notifications' as tabla, COUNT(*) as registros FROM backup_migration_20250113.user_notifications
UNION ALL
SELECT 'api_auth_tokens', COUNT(*) FROM backup_migration_20250113.api_auth_tokens
UNION ALL
SELECT 'auth_users', COUNT(*) FROM backup_migration_20250113.auth_users
UNION ALL
SELECT 'coordinaciones', COUNT(*) FROM backup_migration_20250113.coordinaciones
ORDER BY tabla;
