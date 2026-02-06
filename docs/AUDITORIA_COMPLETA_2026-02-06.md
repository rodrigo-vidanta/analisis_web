# Auditoría Completa - Plataforma PQNC QA AI

**Fecha:** 6 de Febrero 2026  
**Versión:** v2.1.26+  
**Alcance:** Edge Functions, UI Services, Configs, Auth, Seguridad  
**Estado:** Auditoría completada

---

## Índice

1. [Correcciones Aplicadas](#1-correcciones-aplicadas)
2. [Edge Functions - Hallazgos](#2-edge-functions---hallazgos)
3. [Frontend - Hallazgos](#3-frontend---hallazgos)
4. [Auth & Permisos - Hallazgos](#4-auth--permisos---hallazgos)
5. [Patrones de Request Explosion](#5-patrones-de-request-explosion)
6. [Tabla Resumen de Prioridades](#6-tabla-resumen-de-prioridades)
7. [Scorecard de Seguridad Edge Functions](#7-scorecard-de-seguridad-edge-functions)

---

## 1. Correcciones Aplicadas

### 1.1 Request Deduplication en permissionsService.ts

**Problema:** `ERR_INSUFFICIENT_RESOURCES` al cargar módulo de WhatsApp.  
**Causa:** Race condition en cache de `getUserPermissions` — 40-60 requests HTTP simultáneos.  
**Fix:** Promise coalescing con `inflightPermissions` Map + eliminación de llamada duplicada a `getCoordinacionesFilter` en `applyProspectFilters`.

### 1.2 count/head en multi-db-proxy

**Problema:** `POST multi-db-proxy 400 (Bad Request)` + `statement timeout`.  
**Causa:** `pqncSecureClient.ts` no enviaba `count` ni `head` al proxy. Query de conteo ejecutaba `SELECT *` (sin límite) en vez de `SELECT count(*)`.  
**Fix:** Se actualizaron `pqncSecureClient.ts`, `logMonitorSecureClient.ts` y `multi-db-proxy` Edge Function.  
**Deploy:** ✅ Edge Function redeployada exitosamente.

---

## 2. Edge Functions - Hallazgos

### 2.1 CRÍTICO - Sin Validación JWT (6 funciones)

| Función | Riesgo | Nota |
|---------|--------|------|
| `agent-creator-proxy` | Cualquiera puede crear agentes | Sin auth header check |
| `error-log-proxy` | Cualquiera puede escribir logs falsos | Además retorna 200 en error |
| `import-contact-proxy` | Cualquiera puede importar contactos | Sin auth ni input validation |
| `send-audio-proxy` | Cualquiera puede enviar audios WhatsApp | Sin auth |
| `tools-proxy` | Cualquiera puede controlar llamadas | Comentario dice "app protected" pero no es suficiente |
| `transfer-request-proxy` | Cualquiera puede transferir llamadas | Mismo patrón inseguro |

**Acción requerida:** Agregar validación JWT a las 6 funciones siguiendo el patrón de `multi-db-proxy`.

### 2.2 CRÍTICO - Referencias a Tabla Deprecada `auth_users`

| Función | Líneas | Estado |
|---------|--------|--------|
| `mcp-secure-proxy` | 62, 109, 337 | Usa `auth_users` (no existe como tabla directa) |
| `secure-query` | 52, 108 | Usa `auth_users` + session_token legacy |
| `multi-db-proxy` | 41 | `auth_users` en ALLOWED_TABLES (para PQNC_QA, no PQNC_AI) |

**Verificación BD:** Se confirmó que `public.auth_users` **no existe como tabla**. Sin embargo, existe un objeto con ese nombre (probablemente vista de compatibilidad) que permite que el RPC `get_user_permissions` funcione. Esta vista debe documentarse y su existencia debe ser deliberada, no accidental.

### 2.3 ALTO - Autenticación Legacy (session_token)

| Función | Problema |
|---------|----------|
| `mcp-secure-proxy` | Usa `auth_sessions` + session_token en vez de JWT |
| `secure-query` | Usa `auth_sessions` + session_token en vez de JWT |

**Acción requerida:** Migrar a validación JWT estándar.

### 2.4 ALTO - Error Handling Silencioso

| Función | Problema |
|---------|----------|
| `error-log-proxy` | Retorna HTTP 200 incluso cuando falla — enmascara errores |
| `tools-proxy` | Header `livechat_auth` incorrecto (debería ser `2025_livechat_auth`) |
| `transfer-request-proxy` | Mismo problema de header incorrecto |

### 2.5 MEDIO - Objetos de BD sin verificar

| Función | Objeto | Estado |
|---------|--------|--------|
| `cleanup-inactive-sessions` | Vista `active_sessions` | ⚠️ Verificar existencia |
| `cleanup-inactive-sessions` | RPC `cleanup_inactive_sessions` | ⚠️ Verificar existencia |
| `mcp-secure-proxy` | Tabla `mcp_audit_log` | ⚠️ Verificar existencia |

### 2.6 BAJO - Código Muerto (12 backups)

Directorios `z_backup_*` en `supabase/functions/` contienen funciones obsoletas que no están referenciadas. Candidatos a eliminación:
- `z_backup_broadcast-proxy`, `z_backup_dynamics-lead-proxy`, `z_backup_error-analisis-proxy`
- `z_backup_generar-url-optimizada`, `z_backup_n8n-proxy`, `z_backup_pause-bot-proxy`
- `z_backup_send-message-proxy`, `z_backup_timeline-proxy`, `z_backup_tools-proxy`
- `z_backup_transfer-request-proxy`, `z_backup_whatsapp-templates-proxy`, `z_backup_whatsapp-templates-send-proxy`

---

## 3. Frontend - Hallazgos

### 3.1 CRÍTICO - Claves Reales en Documentación

| Archivo | Problema |
|---------|----------|
| `src/components/analysis/README_LIVEMONITOR.md:318,330` | Anon key real de PQNC_AI expuesta |
| `src/components/chat/README.md:336-337` | Anon key + **service_role key** del viejo System_UI expuestas |

**Acción requerida:** Reemplazar con placeholders `<ANON_KEY>` o eliminar.

### 3.2 ALTO - Import de Admin Client Deprecado

| Archivo | Import |
|---------|--------|
| `src/services/prospectsService.ts:4` | `import { analysisSupabaseAdmin }` — nunca se usa, dead code |

**Acción requerida:** Eliminar import.

### 3.3 ALTO - Alias Engañosos de Admin Client

| Archivo | Código |
|---------|--------|
| `src/components/admin/UserManagement.tsx:47` | `import { supabaseSystemUI as pqncSupabaseAdmin }` |
| `src/components/admin/AvatarUpload.tsx:2` | `import { supabaseSystemUI as pqncSupabaseAdmin }` |
| `src/components/admin/UserManagementV2/.../UserCreateModal.tsx:29` | `import { supabaseSystemUI as pqncSupabaseAdmin }` |

**Problema:** El alias `pqncSupabaseAdmin` sugiere que es un admin client cuando es el client normal. Se usa para operaciones de storage.  
**Acción requerida:** Renombrar alias a `supabaseForStorage` o usar `supabaseSystemUI` directamente.

### 3.4 ALTO - Referencia a Proyecto Prohibido

| Archivo | Referencia |
|---------|-----------|
| `src/components/ai-models/README.md:13` | `rnhejbuubpbnojalljso.supabase.co` (SupaClever) |

**Acción requerida:** Eliminar referencia.

### 3.5 MEDIO - Error Handling Silencioso (catch vacíos)

Archivos con múltiples `catch {}` o `catch (e) {}` sin logging:

| Archivo | Instancias |
|---------|-----------|
| `ConversacionesWidget.tsx` | 9 catch vacíos |
| `LiveMonitor.tsx` | 12 catch vacíos |
| `LiveMonitorKanban.tsx` | 5 catch vacíos |
| `LiveChatCanvas.tsx:2651` | 1 catch vacío |
| `ImportWizardModal.tsx:337` | 1 catch vacío |
| `ActiveCallDetailModal.tsx` | 2 catch vacíos |
| `AgentEditor.tsx` | 2 catch vacíos |

**Acción requerida:** Agregar `console.warn` mínimo en cada catch.

### 3.6 MEDIO - Documentación Desactualizada

| Archivo | Problema |
|---------|----------|
| `src/config/README.md:158,162,202` | Ejemplos usan `auth_users` (deprecada) |
| Múltiples CHANGELOG files | Referencias a `zbylezfyagwrxoecioup` (System_UI viejo) |

### 3.7 BAJO - TODOs Pendientes

| Archivo | TODO |
|---------|------|
| `src/services/prospectsService.ts:8` | "Migrar a Edge Functions" |
| `UserManagementV2/.../TreeViewSidebar.tsx:322` | `count: 0 // TODO: count users` |

---

## 4. Auth & Permisos - Hallazgos

### 4.1 Estado General: ✅ CORRECTO

| Componente | Estado | Notas |
|-----------|--------|-------|
| `AuthContext.tsx` | ✅ | Usa Supabase native auth |
| Login flow | ✅ | `signInWithPassword()` nativo |
| `authAdminProxyService.ts` | ✅ | Todo via Edge Function |
| UserManagement writes | ✅ | Via `auth-admin-proxy` |
| Password handling | ✅ | Via `auth-admin-proxy`, sin acceso a `password_hash` |
| Lectura de usuarios | ✅ | Via `user_profiles_v2` |

### 4.2 VERIFICAR - RPC `get_user_permissions`

**Estado actual:** Funciona correctamente (verificado con query real).  
**Código fuente SQL:** Referencia `auth_users` que probablemente resuelve a una vista de compatibilidad.  
**Riesgo:** Si la vista de compatibilidad se elimina, el RPC dejará de funcionar.  
**Acción recomendada:** Actualizar la función RPC para leer de `user_profiles_v2` explícitamente, eliminando dependencia de la vista legacy.

### 4.3 VERIFICAR - Scripts SQL Legacy

| Archivo | Problema |
|---------|----------|
| `scripts/sql/create_coordinaciones_functions.sql` | `get_user_permissions` usa `FROM auth_users u` |
| `scripts/sql/correccion_mayra_boom.sql` | 35+ referencias a `auth_users` |
| `scripts/sql/diagnostico_mayra_boom.sql` | 10+ referencias a `auth_users` |

**Nota:** Estos scripts son de migración/corrección one-time, no se ejecutan en producción. Pero deberían actualizarse si se reutilizan.

---

## 5. Patrones de Request Explosion

### 5.1 CRÍTICO - N+1 Queries

| Archivo | Patrón | Requests |
|---------|--------|----------|
| `ProspectosManager.tsx:1807` | `Promise.all(etapaIds.map(...))` Kanban columns | 10-30 paralelos |
| `UserManagement.tsx:399-480` | `Promise.all(users.map(...))` coordinaciones por usuario | 50-100+ paralelos |
| `CoordinacionesManager.tsx:94` | `Promise.all(data.map(...))` stats por coordinación | 10-20 paralelos |
| `LiveMonitorKanban.tsx:1363` | `Promise.all(coordinacionIds.map(...))` | 20-50 paralelos |

### 5.2 ALTO - Polling Demasiado Frecuente

| Archivo | Intervalo | Requests/min |
|---------|-----------|-------------|
| `LinearLiveMonitor.tsx:285` | 3 segundos | 20/min |
| `LiveChatCanvas.tsx:1846` | 600ms | 100/min |

### 5.3 ALTO - Queries con IN() Masivos

| Archivo | Problema |
|---------|----------|
| `LiveChatCanvas.tsx:5125` | `.in('id', allUserIds)` — puede ser 100+ UUIDs |
| `ConversacionesWidget.tsx:1912` | `.in('id', allUserIds)` — URL enorme |

### 5.4 Estimación de Impacto (Worst Case)

| Módulo | Requests Simultáneos |
|--------|---------------------|
| ProspectosManager (Kanban) | 80+ |
| LiveMonitorKanban | 100+ |
| UserManagement | 100+ |
| LiveChat + Permisos | 40-60 |
| **Total potencial** | **300+** |

**Chrome limit:** ~256 sockets totales, ~6 por dominio.

---

## 6. Tabla Resumen de Prioridades

### Acciones Inmediatas (CRÍTICAS)

| # | Acción | Archivos |
|---|--------|----------|
| 1 | Agregar JWT validation a 6 Edge Functions | `agent-creator-proxy`, `error-log-proxy`, `import-contact-proxy`, `send-audio-proxy`, `tools-proxy`, `transfer-request-proxy` |
| 2 | Eliminar claves reales de documentación | `README_LIVEMONITOR.md`, `chat/README.md` |
| 3 | Eliminar import muerto de `analysisSupabaseAdmin` | `prospectsService.ts` |
| 4 | Actualizar RPC `get_user_permissions` para usar `user_profiles_v2` | SQL en BD + script |

### Acciones a Corto Plazo (ALTO)

| # | Acción | Archivos |
|---|--------|----------|
| 5 | Renombrar alias engañosos `pqncSupabaseAdmin` | `UserManagement.tsx`, `AvatarUpload.tsx`, `UserCreateModal.tsx` |
| 6 | Migrar `mcp-secure-proxy` y `secure-query` de session_token a JWT | Edge Functions |
| 7 | Actualizar `auth_users` en ALLOWED_TABLES de `multi-db-proxy` | Edge Function |
| 8 | Corregir header incorrecto `livechat_auth` → `2025_livechat_auth` | `tools-proxy`, `transfer-request-proxy` |
| 9 | Eliminar referencia a SupaClever | `ai-models/README.md` |
| 10 | Reducir polling de 600ms a 2-3s (LiveChat search) | `LiveChatCanvas.tsx` |

### Acciones a Mediano Plazo (MEDIO)

| # | Acción | Archivos |
|---|--------|----------|
| 11 | Agregar logging a ~32 catch vacíos | Múltiples componentes |
| 12 | Batching de queries N+1 en Kanban/UserMgmt | `ProspectosManager`, `UserManagement`, `CoordinacionesManager` |
| 13 | Throttle de `Promise.all` con concurrency limit | Múltiples archivos |
| 14 | Actualizar documentación (`config/README.md`, CHANGELOGs) | Docs |
| 15 | Verificar existencia de `active_sessions`, `mcp_audit_log` | BD |

### Acciones a Largo Plazo (BAJO)

| # | Acción |
|---|--------|
| 16 | Eliminar 12 directorios `z_backup_*` en Edge Functions |
| 17 | Resolver TODOs pendientes |
| 18 | Estandarizar timeouts en Edge Functions |
| 19 | Agregar rate limiting a Edge Functions |

---

## 7. Scorecard de Seguridad Edge Functions

| Función | Auth | Input Val. | Error Handling | Refs Legacy | Score |
|---------|------|-----------|---------------|------------|-------|
| agent-creator-proxy | ❌ | ❌ | ⚠️ | ✅ | 2/5 |
| anthropic-proxy | ⚠️ | ✅ | ✅ | ✅ | 4/5 |
| auth-admin-proxy | ✅ | ✅ | ✅ | ⚠️ | 4/5 |
| broadcast-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| cleanup-inactive-sessions | ⚠️ | ⚠️ | ✅ | ⚠️ | 3/5 |
| dynamics-lead-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| dynamics-reasignar-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| error-log-proxy | ❌ | ⚠️ | ❌ | ✅ | 1/5 |
| generar-url-optimizada | ✅ | ✅ | ✅ | ✅ | 5/5 |
| import-contact-proxy | ❌ | ⚠️ | ✅ | ✅ | 2/5 |
| mcp-secure-proxy | ⚠️ | ✅ | ✅ | ❌ | 2/5 |
| multi-db-proxy | ✅ | ✅ | ✅ | ⚠️ | 4/5 |
| paraphrase-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| pause-bot-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| secure-query | ⚠️ | ✅ | ✅ | ❌ | 2/5 |
| send-audio-proxy | ❌ | ⚠️ | ✅ | ✅ | 2/5 |
| send-img-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| send-message-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| timeline-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |
| tools-proxy | ❌ | ⚠️ | ✅ | ✅ | 2/5 |
| transfer-request-proxy | ❌ | ⚠️ | ✅ | ✅ | 2/5 |
| trigger-manual-proxy | ✅ | ✅ | ✅ | ✅ | 5/5 |
| whatsapp-templates-proxy | ✅ | ⚠️ | ✅ | ✅ | 4/5 |

**Leyenda:** ✅ Correcto | ⚠️ Necesita mejora | ❌ Problema crítico

**Promedio general:** 3.3/5 — **6 funciones sin autenticación son el principal riesgo.**

---

## Ver También

- [Arquitectura Auth Nativa 2026](ARQUITECTURA_AUTH_NATIVA_2026.md)
- [Migración Auth Users Nativo](MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md)
- [Edge Functions Catalog](EDGE_FUNCTIONS_CATALOG.md)
- [Arquitectura Seguridad 2026](ARQUITECTURA_SEGURIDAD_2026.md)
- [Security Rules](.cursor/rules/security-rules.mdc)

---

**Última actualización:** 6 de Febrero 2026
