# Catálogo de Edge Functions - PQNC QA AI Platform

**Fecha de Creación:** 14 de Enero 2026  
**Última Actualización:** 14 de Enero 2026  
**Versión:** 1.0.0

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura](#arquitectura)
3. [Catálogo de Funciones](#catálogo-de-funciones)
4. [Variables de Entorno Requeridas](#variables-de-entorno-requeridas)
5. [Guía de Deployment](#guía-de-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Resumen Ejecutivo

Las Edge Functions son funciones serverless que se ejecutan en Supabase Edge Runtime (Deno). Se utilizan principalmente como **proxies seguros** para:

1. **Evitar CORS** - El frontend no puede llamar directamente a webhooks externos
2. **Ocultar tokens** - Las API keys se almacenan en variables de entorno del servidor
3. **Logging centralizado** - Todas las llamadas quedan registradas en Supabase Logs

### Estado Actual (Actualizado 2026-01-14)

| Proyecto | Funciones Desplegadas | Estado |
|----------|----------------------|--------|
| **pqnc_ai** (glsmifhkoaifvaegsozd) | 16 | ✅ **PRODUCCIÓN ACTIVA** |
| **system_ui** (zbylezfyagwrxoecioup) | 3 | 📦 Backup (legacy) |

**⚠️ IMPORTANTE:** El frontend ahora usa las Edge Functions de **pqnc_ai**.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                   │
│                        (React + Vite)                                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               │ HTTPS Request
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE EDGE RUNTIME                           │
│                      (Deno - Edge Functions)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ send-message    │  │ pause-bot       │  │ anthropic       │         │
│  │ -proxy          │  │ -proxy          │  │ -proxy          │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│           │ + Auth Token       │ + Auth Token       │ + API Key         │
│           ▼                    ▼                    ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     SERVICIOS EXTERNOS                          │   │
│  ├─────────────────┬───────────────────┬───────────────────────────┤   │
│  │ N8N Railway     │ N8N Railway       │ Anthropic API            │   │
│  │ /webhook/...    │ /webhook/...      │ api.anthropic.com        │   │
│  └─────────────────┴───────────────────┴───────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Catálogo de Funciones

### 1. Funciones de WhatsApp/Comunicación

#### `send-message-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Enviar mensajes de WhatsApp a prospectos |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/send-message` |
| **Variable de Entorno** | `SEND_MESSAGE_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🔴 ALTA |

**Payload de Entrada:**
```json
{
  "message": "Texto del mensaje",
  "uchat_id": "uuid-de-conversacion",
  "id_sender": "uuid-del-usuario"
}
```

**Usado en:** `LiveChatCanvas.tsx`, `WhatsAppModule.tsx`

---

#### `send-img-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Enviar imágenes/media por WhatsApp |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/send-img` |
| **Variable de Entorno** | Header fijo: `livechat_auth: 2025_livechat_auth` |
| **Método HTTP** | POST |
| **Criticidad** | 🔴 ALTA |

**Payload de Entrada:**
```json
[{
  "imagenes": [{ "archivo": "url-de-imagen" }],
  "caption": "Descripción opcional",
  "request_id": "id-de-tracking"
}]
```

**Usado en:** `ImageCatalogModal.tsx`, `LiveChatCanvas.tsx`

---

#### `pause-bot-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Pausar/reanudar bot de WhatsApp en conversación |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/pause_bot` |
| **Variable de Entorno** | `PAUSE_BOT_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Payload de Entrada:**
```json
{
  "uchat_id": "uuid-de-conversacion",
  "duration_minutes": 30,
  "paused_by": "user" | "bot"
}
```

**Usado en:** `LiveChatCanvas.tsx`

---

### 2. Funciones de WhatsApp Templates

#### `whatsapp-templates-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Gestión de plantillas WhatsApp (CRUD) |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates` |
| **Variable de Entorno** | `WHATSAPP_TEMPLATES_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Usado en:** `WhatsAppTemplatesManager.tsx`

---

#### `whatsapp-templates-send-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Envío de plantillas WhatsApp a prospectos |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send` |
| **Variable de Entorno** | `WHATSAPP_TEMPLATES_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🔴 ALTA |

**Usado en:** `WhatsAppTemplatesManager.tsx`, `CampaignsModule.tsx`

---

### 3. Funciones de IA/Análisis

#### `anthropic-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Proxy para llamadas a Claude (Anthropic API) |
| **Endpoint Externo** | `https://api.anthropic.com/v1/messages` |
| **Variable de Entorno** | `ANTHROPIC_API_KEY` |
| **Método HTTP** | POST |
| **Criticidad** | 🔴 ALTA |

**Payload de Entrada:**
```json
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 1024,
  "messages": [{ "role": "user", "content": "..." }]
}
```

**Usado en:** `AnalysisIAComplete.tsx`, `ParaphraseService.ts`

---

#### `error-analisis-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Análisis de errores de llamadas con IA |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/error-analisis` |
| **Variable de Entorno** | `ERROR_ANALISIS_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Usado en:** `CallErrorAnalysis.tsx`

---

### 4. Funciones de CRM/Dynamics

#### `dynamics-lead-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Obtener información de lead desde Dynamics CRM |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/lead-info` |
| **Variable de Entorno** | `DYNAMICS_TOKEN` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Usado en:** `DynamicsCRMManager.tsx`

---

#### `dynamics-reasignar-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Reasignar prospecto en Dynamics CRM |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto` |
| **Variable de Entorno** | `DYNAMICS_TOKEN` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Usado en:** `DynamicsReasignacionService.ts`

---

### 5. Funciones Auxiliares

#### `transfer-request-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Solicitar transferencia de llamada |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/transfer-request` |
| **Variable de Entorno** | `TRANSFER_REQUEST_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Usado en:** `LiveMonitor.tsx`

---

#### `tools-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Ejecutar herramientas personalizadas |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/tools` |
| **Variable de Entorno** | `TOOLS_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟢 BAJA |

---

#### `timeline-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Registrar eventos en timeline de prospecto |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/timeline` |
| **Variable de Entorno** | `TIMELINE_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟢 BAJA |

**Usado en:** `TimelineModule.tsx`

---

#### `broadcast-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Envío masivo de mensajes WhatsApp |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/broadcast` |
| **Variable de Entorno** | `BROADCAST_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟡 MEDIA |

**Usado en:** `CampaignsModule.tsx`

---

#### `n8n-proxy`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Proxy genérico para cualquier webhook N8N |
| **Endpoint N8N** | Dinámico (se envía en el payload) |
| **Variable de Entorno** | `N8N_PROXY_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟢 BAJA |

---

#### `generar-url-optimizada`

| Propiedad | Valor |
|-----------|-------|
| **Propósito** | Generar URLs optimizadas para imágenes |
| **Endpoint N8N** | `https://primary-dev-d75a.up.railway.app/webhook/generar-url` |
| **Variable de Entorno** | `GENERAR_URL_AUTH` |
| **Método HTTP** | POST |
| **Criticidad** | 🟢 BAJA |

---

## Variables de Entorno Requeridas

Estas variables deben configurarse en el proyecto Supabase donde se desplieguen las funciones:

```bash
# ============================================
# WhatsApp/Comunicación
# ============================================
SEND_MESSAGE_AUTH=<valor>          # Módulo: "Enviar Mensaje WhatsApp"
PAUSE_BOT_AUTH=<valor>             # Módulo: "Pausar Bot"

# ============================================
# WhatsApp Templates
# ============================================
WHATSAPP_TEMPLATES_AUTH=<valor>    # Módulo: "Plantillas WhatsApp"
BROADCAST_AUTH=<valor>             # Módulo: "Broadcast WhatsApp"

# ============================================
# IA/Análisis
# ============================================
ANTHROPIC_API_KEY=<api-key>        # API Key de Anthropic (console.anthropic.com)

# ============================================
# CRM/Dynamics
# ============================================
DYNAMICS_TOKEN=<valor>             # Módulo: "Dynamics" → TOKEN

# ============================================
# Llamadas
# ============================================
MANUAL_CALL_AUTH=<valor>           # Módulo: "Llamadas Manuales"

# ============================================
# Media
# ============================================
MEDIA_URL_AUTH=<valor>             # Módulo: "URL Media"
```

### Tokens Almacenados en BD (api_auth_tokens)

| Módulo en BD | Token Key | Uso en Edge Function |
|--------------|-----------|---------------------|
| Enviar Mensaje WhatsApp | `send_message_auth` | `SEND_MESSAGE_AUTH` |
| Pausar Bot | `pause_bot_auth` | `PAUSE_BOT_AUTH` |
| Plantillas WhatsApp | `whatsapp_templates_auth` | `WHATSAPP_TEMPLATES_AUTH` |
| Broadcast WhatsApp | `broadcast_auth` | `BROADCAST_AUTH` |
| Dynamics | `TOKEN` | `DYNAMICS_TOKEN` |
| Llamadas Manuales | `manual_call_auth` | `MANUAL_CALL_AUTH` |
| URL Media | `media_url_auth` | `MEDIA_URL_AUTH` |

### Consultar Tokens

```sql
-- Ver todos los tokens activos
SELECT module_name, token_key, description 
FROM api_auth_tokens 
WHERE is_active = true 
ORDER BY module_name;

-- Obtener valor específico (requiere service_role)
SELECT token_value 
FROM api_auth_tokens 
WHERE module_name = 'Enviar Mensaje WhatsApp' 
AND token_key = 'send_message_auth';
```

---

## Guía de Deployment

### Prerequisitos

1. Supabase CLI instalado: `npm install -g supabase`
2. Login en Supabase: `supabase login`
3. Link al proyecto: `supabase link --project-ref glsmifhkoaifvaegsozd`

### Deployment de una función

```bash
# Navegar al directorio del proyecto
cd /path/to/pqnc-qa-ai-platform

# Desplegar función específica
supabase functions deploy send-message-proxy

# Configurar variable de entorno
supabase secrets set SEND_MESSAGE_AUTH=<valor>

# Verificar deployment
supabase functions list
```

### Deployment masivo

```bash
# Desplegar todas las funciones
supabase functions deploy

# Verificar todas
supabase functions list
```

---

## Troubleshooting

### Error: "CORS blocked"

**Causa:** La función no está retornando headers CORS correctos.

**Solución:** Verificar que `corsHeaders` incluye el origen correcto y que se maneja `OPTIONS`.

### Error: "AUTH no configurado"

**Causa:** Variable de entorno no configurada en Supabase.

**Solución:** 
```bash
supabase secrets set <VARIABLE_NAME>=<valor>
```

### Error: "Webhook Error: 401"

**Causa:** Token de autenticación inválido o expirado.

**Solución:** 
1. Verificar token en `api_auth_tokens`
2. Regenerar token en N8N si es necesario
3. Actualizar en Supabase secrets

### Ver logs de funciones

```bash
# Logs en tiempo real
supabase functions logs <nombre-funcion> --tail

# Logs históricos
supabase functions logs <nombre-funcion>
```

---

## Referencias

- **Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **Deno Runtime:** https://deno.land/manual
- **N8N Webhooks:** `docs/INVENTARIO_WEBHOOKS_N8N.md`
- **API Auth Tokens:** `docs/API_AUTH_TOKENS.md`

---

## Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-01-14 | 1.0.0 | Creación inicial del catálogo |

