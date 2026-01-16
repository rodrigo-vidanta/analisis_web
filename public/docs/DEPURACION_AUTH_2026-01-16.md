# Depuración Sistema de Autenticación

**Fecha:** 16 Enero 2026 21:30 UTC

## TABLAS

| Tabla | Estado | Usos | Acción |
|-------|--------|------|--------|
| auth_users | ✅ ACTIVA | 100 | MANTENER (campos custom) |
| auth_sessions | ❌ OBSOLETA | 0 | RENOMBRADA → z_backup_auth_sessions |
| auth_roles | ✅ ACTIVA | - | MANTENER |
| auth_permissions | ✅ ACTIVA | - | MANTENER |
| auth_user_permissions | ✅ ACTIVA | - | MANTENER |
| auth_user_coordinaciones | ✅ ACTIVA | - | MANTENER |
| auth_login_logs | ✅ ACTIVA | - | MANTENER |
| auth_users_audit_log | ✅ ACTIVA | - | MANTENER |
| auth_role_permissions | ✅ ACTIVA | - | MANTENER |

## EDGE FUNCTIONS

### Activas (6)
| Función | Usos | Propósito |
|---------|------|-----------|
| multi-db-proxy | 20 | Acceso PQNC_QA/LOGMONITOR |
| auth-admin-proxy | 7 | Operaciones admin auth |
| send-img-proxy | 8 | Envío imágenes WhatsApp |
| secure-query | 1 | Consultas seguras |
| anthropic-proxy | 1 | API Claude |
| pause-bot-proxy | 0* | Bot WhatsApp |

*pause-bot-proxy: 0 usos directos, pero usado via botPauseService

### Respaldadas (13)
- z_backup_broadcast-proxy
- z_backup_dynamics-lead-proxy
- z_backup_dynamics-reasignar-proxy
- z_backup_error-analisis-proxy
- z_backup_generar-url-optimizada
- z_backup_n8n-proxy
- z_backup_send-message-proxy
- z_backup_timeline-proxy
- z_backup_tools-proxy
- z_backup_transfer-request-proxy
- z_backup_whatsapp-templates-proxy
- z_backup_whatsapp-templates-send-proxy
- z_backup_pause-bot-proxy

## AUTENTICACIÓN ACTUAL

**Sistema:** Supabase Auth Nativo
**Login:** `supabase.auth.signInWithPassword()`
**Logout:** `supabase.auth.signOut()`
**Sesiones:** JWT en `auth.users` (Supabase nativo)
**Tabla custom:** `auth_users` solo para campos adicionales

**Creación usuario desde UI:**
1. Crea en `auth.users` (Supabase Auth)
2. Actualiza `user_metadata` con campos custom
3. `auth_users` como registro paralelo (legacy/extra fields)

## DECISIÓN

**auth_users:** MANTENER (campos custom necesarios)
**auth_sessions:** RESPALDADA (Supabase Auth maneja sesiones)
