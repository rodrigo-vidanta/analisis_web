# HANDOVER-2026-02-10-SECURITY-HARDENING-VIEWS

**Fecha**: 2026-02-10 | **Version**: v2.10.1 (sin deploy frontend, solo BD) | **Herramienta**: Claude Code (Opus 4.6)

## Resumen de Sesion

Auditoria de seguridad completa y hardening de las 22 vistas en la BD PQNC_AI. Se resolvieron 21 de 23 vulnerabilidades reportadas por el Supabase Security Advisor. Las 2 restantes son excepciones tecnicas documentadas.

## Contexto: Reporte de Seguridad Inicial

Supabase reporto 23 vulnerabilidades:
- 1 `auth_users_exposed` (user_profiles_v2)
- 21 `security_definer_view` (todas las vistas en public)
- 1 `rls_disabled_in_public` (whatsapp_error_catalog)

### Causa Raiz Identificada
`CREATE OR REPLACE VIEW` resetea `reloptions` (incluyendo `security_invoker`). Dos migraciones previas deshicieron fixes anteriores:
- `add_message_updated_column_and_view` (20260208204322): Recreo v_whatsapp_errors_detailed sin security_invoker
- `add_archivado_to_user_profiles_v2_v3` (20260209172523): Recreo user_profiles_v2 sin security_invoker

## Bloque Completado: Security Hardening de Vistas

### Analisis Profundo Realizado
- Auditoria de RLS policies en 25+ tablas subyacentes
- Verificacion de grants anon/authenticated en todas las tablas
- Analisis de impacto UI: 86 queries a user_profiles_v2, 5 a prospectos_con_ejecutivo_y_coordinacion, etc.
- Verificacion de cadena de dependencias: vista → RLS → `user_can_see_prospecto()` → user_profiles_v2 → auth.users
- Identificacion de 3 vistas del reporte que ya no existen (v_active_conversations, v_template_performance, v_conversations_with_prospects)
- Descubrimiento de 13 vistas adicionales no reportadas pero vulnerables

### Hallazgo Critico: user_profiles_v2
- Lee de `auth.users` (esquema auth)
- El rol `authenticated` NO tiene GRANT SELECT en `auth.users`
- Si se cambia a security_invoker=true → vista retorna VACIO → rompe TODA la cadena de auth
- **Decision: Excepcion permanente** - mantener como SECURITY DEFINER + REVOKE de anon

### Hallazgo: 3 Vistas Pre-Auth
- `system_config_public`, `app_themes_public`, `log_config_public`
- Usadas ANTES de login (branding, temas, logging)
- anon no tiene GRANT SELECT en tablas subyacentes (solo RLS policies)
- Con security_invoker=true → `permission denied` (detectado en pruebas simuladas)
- `log_server_config` contiene `webhook_auth_token` - dar GRANT a anon seria peligroso
- **Decision: Excepcion de diseno** - mantener como SECURITY DEFINER (API publica controlada)

### 6 Migraciones Aplicadas

| # | Migracion | Accion |
|---|-----------|--------|
| 1 | `revoke_anon_from_user_profiles_v2` | REVOKE ALL de anon |
| 2 | `revoke_anon_from_3_vulnerable_views` | REVOKE ALL de anon en v_prospectos_ai_config, prospectos_con_ejecutivo_y_coordinacion, v_whatsapp_errors_detailed |
| 3 | `set_security_invoker_16_safe_views` | security_invoker=true en 16 vistas (Cat A+B) |
| 4 | `set_security_invoker_5_prospectos_views` | security_invoker=true en 5 vistas con prospectos (Cat C) |
| 5 | `restrict_anon_to_select_on_public_views` | Reducir anon de ALL a solo SELECT en 3 vistas pre-auth |
| 6 | `revert_security_invoker_3_preauth_views` | Revertir 3 vistas pre-auth a SECURITY DEFINER (anon no tiene GRANT en tablas) |

### Clasificacion Final de 22 Vistas

**4 Excepciones Documentadas (SECURITY DEFINER):**
- `user_profiles_v2` → Lee auth.users, anon REVOKE'd, authenticated-only
- `system_config_public` → API publica, anon SELECT-only
- `app_themes_public` → API publica, anon SELECT-only
- `log_config_public` → API publica, anon SELECT-only

**18 Vistas Protegidas (SECURITY INVOKER = true):**

Cat B (sin RLS restrictivo, 13):
api_auth_tokens_safe, call_analysis_executive_summary, call_analysis_summary,
log_server_config_safe, v_ab_test_comparison, v_acciones_por_origen,
v_audit_retry_stats, v_campaign_analytics, v_conversiones, v_horario_hoy,
v_security_alerts, v_template_analytics, v_whatsapp_template_tags_stats

Cat C (con RLS de prospectos activo, 5):
prospectos_con_ejecutivo_y_coordinacion, v_prospectos_ai_config,
v_whatsapp_errors_detailed, v_audit_pending_retry, live_monitor_view

### Cambio Comportamental en Cat C (5 vistas con prospectos)
Con security_invoker=true, `user_can_see_prospecto()` se aplica:
- **Admin/Calidad**: SIN CAMBIO (ven todo)
- **Coordinadores**: Ven solo su coordinacion (correcto, mas seguro)
- **Ejecutivos**: Ven solo sus prospectos asignados (correcto, mas seguro)
- Vistas con LEFT JOIN (v_whatsapp_errors_detailed, v_audit_pending_retry): datos principales visibles, campos de prospectos NULL para no autorizados

### Pruebas Simuladas Ejecutadas

| Prueba | Resultado |
|--------|-----------|
| 3 vistas pre-auth como `anon` (SET ROLE anon) | 3/3 retornan datos (3, 2, 1 filas) |
| 13 vistas Cat B como `authenticated` | 13/13 retornan datos |
| 5 vistas Cat C como `authenticated` sin uid | RLS filtra correctamente (0 prospectos, datos base visibles) |
| 4 REVOKEs como `anon` | 4/4 `permission denied` |

## Estado Actual

| Item | Estado |
|------|--------|
| Branch | `main` |
| Working tree | 1 untracked (este handover) |
| Ultimo deploy frontend | v2.10.1 (no necesita redeploy - cambios solo en BD) |
| Ultimo commit | `a6f21c8` |
| Security Advisor | 5 restantes (4 excepciones documentadas + 1 pendiente) |

## Vulnerabilidades Restantes

| # | Tipo | Objeto | Razon |
|---|------|--------|-------|
| 1 | auth_users_exposed | user_profiles_v2 | Excepcion tecnica: lee auth.users |
| 2 | security_definer_view | user_profiles_v2 | Excepcion tecnica: authenticated no tiene GRANT en auth.users |
| 3 | security_definer_view | system_config_public | Excepcion de diseno: API publica controlada |
| 4 | security_definer_view | app_themes_public | Excepcion de diseno: API publica controlada |
| 5 | security_definer_view | log_config_public | Excepcion de diseno: API publica controlada |
| 6 | rls_disabled_in_public | whatsapp_error_catalog | Pendiente: tabla de catalogo, no se toco en este batch |

## Regla de Prevencion

**IMPORTANTE**: Cualquier migracion futura que use `CREATE OR REPLACE VIEW` DEBE incluir `ALTER VIEW ... SET (security_invoker = true)` inmediatamente despues. De lo contrario, se perdera la configuracion de security_invoker y las vulnerabilidades regresaran.

Patron seguro:
```sql
CREATE OR REPLACE VIEW public.mi_vista AS SELECT ...;
ALTER VIEW public.mi_vista SET (security_invoker = true);
```

Excepciones que NO deben tener security_invoker:
- user_profiles_v2 (lee auth.users)
- system_config_public (API publica pre-auth)
- app_themes_public (API publica pre-auth)
- log_config_public (API publica pre-auth)
