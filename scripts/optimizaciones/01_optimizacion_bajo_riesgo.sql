-- ============================================
-- SCRIPT: Optimizaciones de Base de Datos - BAJO RIESGO
-- PROYECTO: PQNC_AI (glsmifhkoaifvaegsozd)
-- FECHA: 2026-01-14
-- ESTADO PRE-OPTIMIZACION: 322 indices
-- ============================================

-- ============================================
-- SECCION 1: INDICES DUPLICADOS EN llamadas_ventas
-- ============================================
-- Justificacion: El frontend usa call_status, fecha_llamada y prospecto
-- pero solo necesita UN indice por columna. Los duplicados causan
-- doble trabajo en INSERT/UPDATE sin beneficio en lecturas.

-- Grupo 1: call_status (mantener idx_llamadas_ventas_call_status)
DROP INDEX IF EXISTS public.idx_live_monitor_status;
DROP INDEX IF EXISTS public.idx_llamadas_call_status;

-- Grupo 2: checkpoint_venta_actual (mantener idx_live_monitor_checkpoint)
DROP INDEX IF EXISTS public.idx_llamadas_checkpoint;

-- Grupo 3: fecha_llamada DESC (mantener idx_live_monitor_fecha)
DROP INDEX IF EXISTS public.idx_fecha_llamada;

-- Grupo 4: fecha_llamada ASC (mantener idx_llamadas_ventas_fecha)
DROP INDEX IF EXISTS public.idx_llamadas_fecha;

-- Grupo 5: prospecto (mantener idx_llamadas_prospecto que tiene WHERE)
DROP INDEX IF EXISTS public.idx_live_monitor_prospecto;
DROP INDEX IF EXISTS public.idx_llamadas_ventas_prospecto;

-- ============================================
-- SECCION 2: INDICES GIN NO USADOS
-- ============================================
-- Justificacion: El frontend solo hace SELECT de estos campos JSON,
-- NUNCA filtra por su contenido. Los indices GIN son costosos de mantener.

DROP INDEX IF EXISTS public.idx_datos_llamada;      -- GIN en JSON, 1768 KB
DROP INDEX IF EXISTS public.idx_datos_objeciones;   -- GIN en JSON, 48 KB
DROP INDEX IF EXISTS public.idx_resumen;            -- btree en JSON
DROP INDEX IF EXISTS public.idx_timestamp_unix;     -- btree en JSON

-- ============================================
-- SECCION 3: INDICES DE TABLAS LEGACY
-- ============================================
-- Justificacion: user_notifications_legacy tiene 0 referencias en frontend

DROP INDEX IF EXISTS public.idx_user_notifications_legacy_is_read;
DROP INDEX IF EXISTS public.idx_user_notifications_legacy_created_at;
DROP INDEX IF EXISTS public.idx_user_notifications_legacy_prospect_id;
DROP INDEX IF EXISTS public.idx_user_notifications_legacy_notification_type;
DROP INDEX IF EXISTS public.idx_user_notifications_legacy_call_id;
DROP INDEX IF EXISTS public.idx_user_notifications_legacy_conversation_id;
DROP INDEX IF EXISTS public.idx_uchat_assigned_agent;

-- ============================================
-- SECCION 4: INDICES DE TABLAS PEQUENAS DE CONFIGURACION
-- ============================================
-- Justificacion: Tablas con <20 filas donde indices no aportan valor

-- app_themes (~5 filas)
DROP INDEX IF EXISTS public.idx_app_themes_name;
DROP INDEX IF EXISTS public.idx_app_themes_active;

-- system_config (~10 filas)
DROP INDEX IF EXISTS public.idx_system_config_active;

-- auth_roles (9 filas)
DROP INDEX IF EXISTS public.idx_auth_roles_is_active;

-- coordinaciones (7 filas)
DROP INDEX IF EXISTS public.idx_coordinaciones_is_active;

-- resorts (~20 filas)
DROP INDEX IF EXISTS public.idx_resorts_nombre;
DROP INDEX IF EXISTS public.idx_resorts_active;

-- ============================================
-- SECCION 5: INDICES DE LLAMADAS_VENTAS SIN USAR
-- ============================================
-- Justificacion: Indices que nunca se consultan segun pg_stat_user_indexes

DROP INDEX IF EXISTS public.idx_nivel_interes;
DROP INDEX IF EXISTS public.idx_tipo_llamada;
DROP INDEX IF EXISTS public.idx_seguimiento;
DROP INDEX IF EXISTS public.idx_llamadas_feedback_resultado;
DROP INDEX IF EXISTS public.idx_llamadas_tiene_feedback;
DROP INDEX IF EXISTS public.idx_llamadas_feedback_fecha;
DROP INDEX IF EXISTS public.idx_llamadas_ejecutivo;

-- ============================================
-- SECCION 6: INDICES DE AUDIT LOGS
-- ============================================
-- Justificacion: Solo se hace INSERT, rara vez se consultan por estos campos

DROP INDEX IF EXISTS public.idx_assignment_logs_prospect_id;
DROP INDEX IF EXISTS public.idx_assignment_logs_coordinacion_id;
DROP INDEX IF EXISTS public.idx_assignment_logs_created_at;

-- ============================================
-- SECCION 7: OTROS INDICES SIN USAR
-- ============================================

-- User notifications (la tabla principal, no legacy)
DROP INDEX IF EXISTS public.idx_user_notifications_notification_type;
DROP INDEX IF EXISTS public.idx_user_notifications_message_id;
DROP INDEX IF EXISTS public.idx_user_notifications_call_id;
DROP INDEX IF EXISTS public.idx_user_notifications_prospect_id;

-- Admin messages
DROP INDEX IF EXISTS public.idx_admin_messages_status;
DROP INDEX IF EXISTS public.idx_admin_messages_sender;
DROP INDEX IF EXISTS public.idx_admin_messages_recipient;

-- Auth
DROP INDEX IF EXISTS public.idx_auth_users_role_id;
DROP INDEX IF EXISTS public.idx_auth_sessions_expires_at;

-- Otros
DROP INDEX IF EXISTS public.idx_horarios_excepciones_recurrente;
DROP INDEX IF EXISTS public.idx_cmw_user_id;
DROP INDEX IF EXISTS public.idx_cmw_created_at;
DROP INDEX IF EXISTS public.idx_paraphrase_logs_user_email;
DROP INDEX IF EXISTS public.idx_paraphrase_logs_has_moderation_warning;
DROP INDEX IF EXISTS public.idx_paraphrase_logs_warning_id;

-- ============================================
-- VERIFICACION POST-EJECUCION
-- ============================================
-- Ejecutar despues para confirmar reduccion:
-- SELECT COUNT(*) as indices_restantes FROM pg_indexes WHERE schemaname = 'public';
-- Esperado: Reduccion de ~40-50 indices
