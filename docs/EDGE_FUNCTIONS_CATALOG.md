# Catalogo de Edge Functions - PQNC QA AI Platform

**Fecha:** 2026-02-13 | **Version:** 2.0.0 | **Total:** 25 funciones activas

---

## Resumen

Edge Functions serverless en Supabase Edge Runtime (Deno). Propositos principales:
1. **Evitar CORS** - Frontend no puede llamar webhooks externos directamente
2. **Ocultar tokens** - API keys en variables de entorno del servidor
3. **Logging** - Todas las llamadas en Supabase Logs
4. **Seguridad** - JWT validation, session tokens, whitelists de tablas

**Proyecto:** PQNC_AI (`glsmifhkoaifvaegsozd`)

---

## Llamada desde Frontend

```typescript
// Patron obligatorio para Edge Functions
import { authenticatedEdgeFetch } from '@/utils/authenticatedFetch';

const response = await authenticatedEdgeFetch('function-name', {
  method: 'POST',
  body: { param1: 'value' }
});
```

`authenticatedEdgeFetch` maneja: token refresh proactivo, retry en 401, force logout en fallo persistente.

---

## Catalogo Completo (25 funciones)

### 1. Auth y Usuarios

| Funcion | Proposito | Auth | Lineas |
|---------|-----------|------|--------|
| **auth-admin-proxy** | CRUD usuarios via Supabase Auth nativo | JWT + service_role | ~839 |
| **cleanup-inactive-sessions** | Limpiar sesiones inactivas (cron) | Ninguna (cron) | ~111 |

#### auth-admin-proxy

Operaciones: `updateLastLogin`, `getUserById`, `updateUserField`, `verifyPassword`, `changePassword`, `createUser`, `updateUserMetadata`, `updateUserEmail`, `deleteUser`, `assignUserToGroup`, `removeUserFromGroup`, `getUserGroups`, `getExecutivesWithBackup`, `updateIsOperativo`, `resetFailedAttempts`

**Regla:** `updateIsOperativo` requiere `id_dynamics` presente.

#### cleanup-inactive-sessions

- Diseno: cron job via pg_cron (cada 1 minuto)
- Llama RPC `cleanup_inactive_sessions`
- Limpia sesiones expiradas o inactivas > 2 minutos

---

### 2. IA y LLM

| Funcion | Proposito | Auth | Lineas | Servicio Externo |
|---------|-----------|------|--------|-----------------|
| **anthropic-proxy** | Proxy a Claude API | No JWT (API key only) | ~206 | Anthropic API |
| **paraphrase-proxy** | Parafraseo de mensajes via N8N | JWT | ~94 | N8N webhook |

#### anthropic-proxy

- Secret: `ANTHROPIC_API_KEY`
- Detecta problemas de billing (401/402) y retorna flag `isTokenIssue`
- Body: `{ model, messages, ...anthropicParams }`

#### paraphrase-proxy

- Endpoint N8N: `/webhook/mensaje-agente`
- Secrets: `LIVECHAT_AUTH`, `N8N_MENSAJE_AGENTE_URL`

---

### 3. WhatsApp y Mensajeria

| Funcion | Proposito | Auth | Lineas | Endpoint N8N |
|---------|-----------|------|--------|-------------|
| **send-message-proxy** | Enviar mensajes WhatsApp | JWT | ~147 | `/webhook/send-message` |
| **send-img-proxy** | Enviar imagenes WhatsApp | JWT | ~121 | `/webhook/send-img` |
| **send-audio-proxy** | Enviar audio WhatsApp | No JWT | ~93 | `/webhook/send-audio` |
| **pause-bot-proxy** | Pausar/reanudar bot | JWT | ~155 | `/webhook/pause_bot` |
| **broadcast-proxy** | Envio masivo WhatsApp | JWT | ~145 | `/webhook/broadcast` |
| **whatsapp-templates-proxy** | CRUD plantillas WhatsApp | JWT | ~167 | `/webhook/whatsapp-templates` |

#### send-message-proxy

- Body: `{ message, uchat_id, type?, ttl?, id_sender? }`
- Secret: `LIVECHAT_AUTH` (header: `2025_livechat_auth`)

#### send-img-proxy

- Body: `[{ imagenes: [{ archivo }], caption?, request_id }]`
- Incluye request ID tracking para debugging
- Secret: `LIVECHAT_AUTH`, `N8N_SEND_IMG_URL`

#### send-audio-proxy

- Body: `{ audio_base64, uchat_id, filename?, id_sender? }`
- Migrado a Deno.serve() nativo (Feb 2026)

#### pause-bot-proxy

- Body: `{ uchat_id, ttl?, duration_minutes? }`
- TTL=0 reanuda el bot

#### broadcast-proxy

- Body: Configuracion completa de campana
- Secret: `LIVECHAT_AUTH` (fallback a tabla `api_auth_tokens`)

#### whatsapp-templates-proxy

- Soporta GET, POST, PUT, DELETE (siempre usa POST a N8N)
- Timeout: 90s
- Secret: `WHATSAPP_TEMPLATES_AUTH`

---

### 4. Microsoft Dynamics CRM

| Funcion | Proposito | Auth | Lineas | Endpoint N8N |
|---------|-----------|------|--------|-------------|
| **dynamics-lead-proxy** | Query leads de Dynamics | JWT | ~161 | `/webhook/lead-info` |
| **dynamics-reasignar-proxy** | Reasignar prospectos | JWT | ~160 | `/webhook/reasignar-prospecto` |
| **import-contact-proxy** | Importar contacto de CRM | No JWT | ~89 | `/webhook/import-contact-crm` |

#### dynamics-lead-proxy

- Timeout: 90s
- Headers: `Authorization: Bearer` + `x-dynamics-token`
- Secret: `DYNAMICS_TOKEN`

#### dynamics-reasignar-proxy

- Timeout: 120s (CRM ops lentas)
- Misma auth que dynamics-lead-proxy

#### import-contact-proxy

- Body: `{ lead_dynamics: { Coordinacion, CoordinacionID, ... } }`
- Detecta respuesta vacia de N8N (coordinacion no encontrada) -> 422

---

### 5. VAPI y Llamadas

| Funcion | Proposito | Auth | Lineas | Endpoint N8N |
|---------|-----------|------|--------|-------------|
| **trigger-manual-proxy** | Programar/editar/eliminar llamadas | JWT | ~194 | `/webhook/trigger-manual` |
| **tools-proxy** | Ejecutar acciones en llamada | No JWT | ~130 | `/webhook/tools` |
| **transfer-request-proxy** | Solicitar transferencia | No JWT | ~103 | `/webhook/transfer_request` |
| **timeline-proxy** | Procesar timeline con LLM | JWT | ~144 | `/webhook/timeline` |

#### trigger-manual-proxy

- Actions: INSERT, UPDATE, DELETE
- Body: `{ action, prospecto_id, user_id, justificacion, scheduled_timestamp, schedule_type, customer_phone, customer_name, ... }`
- Secret: `MANUAL_CALL_AUTH` (header: `Auth`)

#### tools-proxy

- Body: `{ action, call_id }`
- Tolera respuestas vacias/non-JSON de N8N

#### timeline-proxy

- Timeout: 90s (procesamiento LLM)
- Migrado a Deno.serve() nativo

---

### 6. Media y Storage

| Funcion | Proposito | Auth | Lineas | Servicio Externo |
|---------|-----------|------|--------|-----------------|
| **generar-url-optimizada** | URLs firmadas para GCS | JWT (role check) | ~195 | Railway GCS service |

- Body: `{ filename, bucket, expirationMinutes? }`
- Secret: `GCS_API_TOKEN` o `MEDIA_URL_AUTH`
- Solo usuarios authenticated (no anon)

---

### 7. Acceso a Base de Datos

| Funcion | Proposito | Auth | Lineas |
|---------|-----------|------|--------|
| **multi-db-proxy** | Queries multi-DB (PQNC_QA, LOGMONITOR) | JWT (role check) | ~326 |
| **secure-query** | Queries PQNC_AI con session token | Session token | ~260 |
| **mcp-secure-proxy** | Operaciones MCP desde IDE | Session token | ~514 |

#### multi-db-proxy

- Databases: `PQNC_QA` (hmmfuhqgvsehkizlfzga), `LOGMONITOR` (dffuwdzybhypxfzrmdcz)
- Operaciones: select, insert, update, delete
- Tablas whitelistadas por database
- Secrets: `PQNC_QA_SERVICE_KEY`, `LOGMONITOR_SERVICE_KEY`

#### secure-query

- Auth: `x-session-token` header
- Origins permitidos: ai.vidavacations.com, localhost, N8N Railway
- Tablas: prospectos, llamadas_ventas, conversaciones_whatsapp, mensajes_whatsapp, user_profiles_v2, auth_sessions, coordinaciones, auth_roles

#### mcp-secure-proxy

- Operaciones read: `query_table`, `get_schema`, `get_table_info`, `execute_read_sql`
- Operaciones write: `insert_data`, `update_data`, `backup_table` (admin only)
- Prohibido: `delete_data` (no-admin), `drop_table`, `truncate_table`
- Audit logging a `mcp_audit_log`
- Max 1000 rows por query

---

### 8. Utilidades

| Funcion | Proposito | Auth | Lineas | Endpoint N8N |
|---------|-----------|------|--------|-------------|
| **agent-creator-proxy** | Crear agentes IA via N8N | No JWT | ~60 | `/webhook/agent_creator` |
| **error-log-proxy** | Logs de errores frontend | No JWT | ~79 | `/webhook/error-log` |
| **pull-uchat-errors** | Pull errores WhatsApp de UChat | Cron/manual | ~200 | UChat API directa |

#### agent-creator-proxy

- Proxy simple a N8N workflow de creacion de agentes

#### error-log-proxy

- Retorna 200 incluso en fallo (logging no debe bloquear)
- Secrets: `ERROR_LOG_AUTH`, `N8N_ERROR_LOG_URL`

#### pull-uchat-errors

- Escanea 4,213 subscribers por campo Error_Message (`f190385v8089539`)
- Dedup por user+error+dia en tabla `whatsapp_delivery_errors`
- N8N Workflow: "Pull UChat Errors -> Supabase [PROD]" cada 30 min
- Secret: `UCHAT_API_KEY`

---

## Patrones Comunes

### Headers de Autenticacion

| Patron | Header | Funciones |
|--------|--------|-----------|
| JWT | `Authorization: Bearer <jwt>` | La mayoria |
| Session | `x-session-token: <token>` | secure-query, mcp-secure-proxy |
| N8N livechat | `2025_livechat_auth: <token>` | send-message, send-img, pause-bot, broadcast |
| Dynamics | `x-dynamics-token: <token>` | dynamics-lead, dynamics-reasignar |
| Manual call | `Auth: <token>` | trigger-manual |

### CORS

Todas las funciones incluyen:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: POST, OPTIONS
```

### Migracion Deno.serve()

Funciones migradas de `serve()` import a `Deno.serve()` nativo (Feb 2026) para evitar timeout de bundles:
- dynamics-lead-proxy, dynamics-reasignar-proxy, timeline-proxy, whatsapp-templates-proxy, send-audio-proxy

---

## Backups

17 directorios `z_backup_*` en `supabase/functions/` con versiones archivadas. No desplegados.

---

## Deployment

```bash
# Deploy individual
npx supabase functions deploy {nombre} --project-ref glsmifhkoaifvaegsozd

# Deploy todas
npx supabase functions deploy

# Configurar secrets
npx supabase secrets set KEY=value --project-ref glsmifhkoaifvaegsozd

# Ver logs
npx supabase functions logs {nombre} --tail
```

---

## Variables de Entorno (Secrets)

| Secret | Usado por |
|--------|-----------|
| `ANTHROPIC_API_KEY` | anthropic-proxy |
| `LIVECHAT_AUTH` | send-message, send-img, send-audio, pause-bot, broadcast, tools, transfer-request, import-contact, error-log |
| `DYNAMICS_TOKEN` | dynamics-lead, dynamics-reasignar |
| `WHATSAPP_TEMPLATES_AUTH` | whatsapp-templates-proxy |
| `MANUAL_CALL_AUTH` | trigger-manual-proxy |
| `GCS_API_TOKEN` / `MEDIA_URL_AUTH` | generar-url-optimizada |
| `PQNC_QA_SERVICE_KEY` | multi-db-proxy |
| `LOGMONITOR_SERVICE_KEY` | multi-db-proxy |
| `UCHAT_API_KEY` | pull-uchat-errors |
| `ERROR_LOG_AUTH` | error-log-proxy |
| `N8N_SEND_IMG_URL` | send-img-proxy |
| `N8N_MENSAJE_AGENTE_URL` | paraphrase-proxy |
| `N8N_ERROR_LOG_URL` | error-log-proxy |

---

## Historial

| Fecha | Version | Cambios |
|-------|---------|---------|
| 2026-01-14 | 1.0.0 | Creacion inicial (16 funciones) |
| 2026-02-13 | 2.0.0 | Reescrito completo: 25 funciones verificadas contra codigo |
