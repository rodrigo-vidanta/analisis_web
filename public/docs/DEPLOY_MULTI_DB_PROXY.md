# Deploy Edge Function: multi-db-proxy

**Fecha:** 15 Enero 2026  
**Autor:** Darig Samuel Rosales Robledo

---

## 📋 Descripción

Edge Function que actúa como proxy seguro para consultas a bases de datos externas:

| Base de Datos | Proyecto ID | Uso |
|---------------|-------------|-----|
| **PQNC_QA** | `hmmfuhqgvsehkizlfzga` | Llamadas PQNC, Feedback, Bookmarks |
| **LOGMONITOR** | `dffuwdzybhypxfzrmdcz` | Dashboard de Logs, Error tracking |

## 🔐 Arquitectura de Seguridad

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ multiDbProxyService.ts                               │    │
│  │ - Solo envía: database, table, operation, filters    │    │
│  │ - NO tiene acceso a service_keys                     │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │ POST /functions/v1/multi-db-proxy
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION (PQNC_AI)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ multi-db-proxy/index.ts                              │    │
│  │ - Valida database, tabla, operación                  │    │
│  │ - Obtiene service_key de SECRETS                     │    │
│  │ - Ejecuta query con service_role                     │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│  SECRETS (Supabase Dashboard):                              │
│  - PQNC_QA_SERVICE_KEY = eyJhbG...                          │
│  - LOGMONITOR_SERVICE_KEY = eyJhbG...                       │
└──────────────────────────┼──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│      PQNC_QA         │         │     LOGMONITOR       │
│ hmmfuhqgvsehkizlfzga │         │ dffuwdzybhypxfzrmdcz │
└──────────────────────┘         └──────────────────────┘
```

## 🚀 Pasos de Deploy

### 1. Configurar Secrets en Supabase Dashboard

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar proyecto **PQNC_AI** (`glsmifhkoaifvaegsozd`)
3. Ir a **Settings > Edge Functions**
4. En la sección **Secrets**, agregar:

```
PQNC_QA_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg

LOGMONITOR_SERVICE_KEY = [OBTENER DEL .env.local]
```

### 2. Deploy de la Edge Function

```bash
# Navegar al directorio del proyecto
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform

# Login a Supabase (si no está logueado)
npx supabase login

# Link al proyecto PQNC_AI
npx supabase link --project-ref glsmifhkoaifvaegsozd

# Deploy la Edge Function
npx supabase functions deploy multi-db-proxy --no-verify-jwt
```

### 3. Verificar Deploy

```bash
# Test desde terminal
curl -X POST \
  'https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/multi-db-proxy' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [ANON_KEY]' \
  -d '{
    "database": "LOGMONITOR",
    "operation": "select",
    "table": "error_log",
    "limit": 5
  }'
```

## 📝 Uso desde el Frontend

### Consultar PQNC_QA

```typescript
import { pqncQaProxy } from '../services/multiDbProxyService';

// SELECT
const { data, error } = await pqncQaProxy.select('calls', {
  select: 'id, call_id, customer_name',
  filters: { call_status: 'completed' },
  order: 'created_at.desc',
  limit: 50,
});

// INSERT
const { data, error } = await pqncQaProxy.insert('call_feedback', {
  call_id: 'uuid-here',
  rating: 5,
  comments: 'Excelente servicio',
});
```

### Consultar LOGMONITOR

```typescript
import { logMonitorProxy } from '../services/multiDbProxyService';

// SELECT con filtros complejos
const { data, error } = await logMonitorProxy.select('error_log', {
  select: '*',
  filters: {
    severidad: 'critica',
    created_at: { op: 'gte', value: '2026-01-01' },
  },
  order: 'created_at.desc',
  limit: 100,
});

// UPDATE
const { data, error } = await logMonitorProxy.update(
  'error_log',
  { estado: 'resuelto' },
  { id: 'uuid-here' }
);
```

## ⚠️ Tablas Permitidas

La Edge Function solo permite acceso a tablas específicas:

### PQNC_QA
- `calls`
- `call_feedback`
- `bookmarks`
- `user_bookmarks`
- `call_results`
- `call_analysis`
- `agent_performance`

### LOGMONITOR
- `error_log`
- `ui_error_log_status`
- `ui_error_log_annotations`
- `ui_error_log_tags`
- `ui_error_log_ai_analysis`

Para agregar más tablas, modificar `ALLOWED_TABLES` en `multi-db-proxy/index.ts`.

## 🔒 Seguridad

| Aspecto | Implementación |
|---------|----------------|
| Service Keys | Solo en SECRETS de Edge Function |
| Validación de BD | Whitelist de databases válidas |
| Validación de Tablas | Whitelist por database |
| DELETE sin WHERE | Bloqueado (requiere filters) |
| UPDATE sin WHERE | Bloqueado (requiere filters) |
| CORS | Headers configurados |

## 📋 Troubleshooting

### Error: "Credenciales no configuradas"
- Verificar que los SECRETS están configurados en Supabase Dashboard
- Nombre exacto: `PQNC_QA_SERVICE_KEY`, `LOGMONITOR_SERVICE_KEY`

### Error: "Tabla no permitida"
- Verificar que la tabla está en `ALLOWED_TABLES`
- Agregar tabla si es necesaria

### Error 403 Forbidden
- Verificar que la Edge Function está deployed
- Verificar que se está enviando el Authorization header

---

**Documentación relacionada:**
- `docs/EDGE_FUNCTIONS_CATALOG.md`
- `src/services/multiDbProxyService.ts`
