# Handover: Fix Edge Functions 404 + Restauración Producción

**REF:** HANDOVER-2026-02-06-EDGE-FUNCTIONS-FIX  
**Fecha:** 2026-02-06  
**Estado:** COMPLETADO

---

## Problema Inicial

Al intentar quitar el número de teléfono a un ejecutivo desde Administración > Usuarios > Editor de usuarios, la operación fallaba con error CORS:

```
Access to fetch at '.../functions/v1/auth-admin-proxy' from origin 'https://ai.vidavacations.com'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
It does not have HTTP ok status.
```

---

## Diagnóstico

Se descubrió que **10 de 27 Edge Functions** estaban en estado "fantasma": registradas como `ACTIVE` en el Management API de Supabase pero sin código desplegado en el runtime (retornaban 404).

**Método de detección:**

```bash
curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: https://ai.vidavacations.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/{SLUG}"
```

**Hallazgo clave:** `verify_jwt=true` NO causa problemas CORS en funciones correctamente desplegadas. Supabase permite el OPTIONS preflight independientemente de esa configuración. La causa real del error CORS es la ausencia de código desplegado (404 del relay de Supabase, sin headers CORS).

---

## Correcciones Aplicadas

### 1. Funciones con fix inmediato (redeploy directo)

| Función | Acción | Comando |
|---------|--------|---------|
| `auth-admin-proxy` | Redeploy + verify_jwt=false | `npx supabase functions deploy auth-admin-proxy --no-verify-jwt` |
| `secure-query` | Redeploy + verify_jwt=false | `npx supabase functions deploy secure-query --no-verify-jwt` |
| `cleanup-inactive-sessions` | Redeploy (ya usaba Deno.serve()) | `npx supabase functions deploy cleanup-inactive-sessions --no-verify-jwt` |

### 2. Funciones migradas al patrón Gold Standard

Se crearon directorios principales con código migrado desde `z_backup_*` al patrón moderno:

| Función | Origen | Patrón |
|---------|--------|--------|
| `whatsapp-templates-proxy` | `z_backup_whatsapp-templates-proxy/` | `Deno.serve()` + JWT manual + timeout 90s |
| `timeline-proxy` | `z_backup_timeline-proxy/` | `Deno.serve()` + JWT manual + timeout 90s |

**Patrón Gold Standard aplicado** (basado en `dynamics-lead-proxy`):
- `Deno.serve()` nativo (sin `import { serve } from 'deno.land/std'`)
- Validación JWT manual via `/auth/v1/user` (sin importar `@supabase/supabase-js`)
- `AbortController` con timeout de 90 segundos
- Manejo robusto de respuestas vacías de N8N
- Logs estructurados con prefijo de función

### 3. Funciones documentadas como deprecadas (sin acción)

| Función | Razón |
|---------|-------|
| `agent-creator-proxy` | Feature eliminada del producto |
| `cotizar-habitacion` | Sin código fuente ni referencias en codebase |
| `error-analisis-proxy` | Componente `CallErrorAnalysis.tsx` no existe |
| `n8n-proxy` | Sin uso directo en UI |
| `anthropic-proxy` | Sin referencias en `src/` |

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/whatsapp-templates-proxy/index.ts` | Edge Function restaurada con patrón moderno |
| `supabase/functions/whatsapp-templates-proxy/deno.json` | Configuración Deno |
| `supabase/functions/timeline-proxy/index.ts` | Edge Function restaurada con patrón moderno |
| `supabase/functions/timeline-proxy/deno.json` | Configuración Deno |
| `scripts/edge-functions-health-check.ts` | Script de detección de funciones fantasma |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `.cursor/handovers/2026-02-06-analisis-edge-functions-404.md` | Documentación de deprecaciones y funciones restauradas |

---

## Estado Final Verificado

```
========================================
  EDGE FUNCTIONS HEALTH CHECK
  Fecha: 2026-02-06T22:12:13.498Z
========================================
  OK:         21
  GHOST:      0
  ERROR:      0
  DEPRECATED: 6
  TOTAL:      27
```

Health check ejecutable con: `npx tsx scripts/edge-functions-health-check.ts`

---

## Verificaciones de Seguridad

Las funciones restauradas (`whatsapp-templates-proxy`, `timeline-proxy`) fueron verificadas:

- OPTIONS preflight → 200 (CORS funcional)
- POST sin Authorization → 401 "Missing authorization header"
- POST con anon key → 401 "Authentication required"
- Solo usuarios con sesión activa (JWT de usuario) pueden invocarlas

---

## Problema Secundario Detectado: Parafraseo

Al verificar la funcionalidad post-fix, se detectó un error intermitente en `paraphrase-proxy`:

```
POST .../functions/v1/paraphrase-proxy 500
Error: {"message":"Workflow execution failed"}
```

**Diagnóstico:** La Edge Function funciona correctamente. El error proviene del workflow de N8N `Parafrasear mensaje agente [UI] [PROD]` (ID: `58EiIGUSfFmGQVFz`), específicamente del nodo `Black&White list` que consulta Airtable y recibe `RATE_LIMIT_REACHED`.

- Ejecución fallida: `https://primary-dev-d75a.up.railway.app/workflow/58EiIGUSfFmGQVFz/executions/926742`
- De las últimas 5 ejecuciones, 4 fueron exitosas y 1 falló por rate limit
- Es un problema intermitente de saturación de Airtable (5 req/seg por base), no del código

**No se corrigió** porque es un problema de infraestructura N8N/Airtable, no de la plataforma.

---

## Riesgos Latentes

1. **14 funciones usan `serve()` legacy** (`import { serve } from 'deno.land/std@0.168.0'`). Si Supabase depreca esta API, fallarán al siguiente redeploy.
2. **`cleanup-inactive-sessions` + pg_cron:** La función se desplegó pero no se verificó si el cron job está configurado en Supabase. Verificar en Dashboard > Database > Extensions > pg_cron.
3. **Despliegues fantasma:** El health check script permite detectar el problema pero no previene que ocurra. Ejecutar después de cada deploy.

---

## Comandos Útiles

```bash
# Health check de todas las Edge Functions
npx tsx scripts/edge-functions-health-check.ts

# Login a Supabase CLI
cat .supabase/access_token | npx supabase login --no-browser

# Deploy de una función específica
npx supabase functions deploy {SLUG} --project-ref glsmifhkoaifvaegsozd --no-verify-jwt

# Verificar OPTIONS de una función
curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: https://ai.vidavacations.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/{SLUG}"
```

---

**Última actualización:** 2026-02-06 22:30 UTC
