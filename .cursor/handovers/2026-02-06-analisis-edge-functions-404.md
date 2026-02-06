# Análisis: Edge Functions con Despliegue Corrupto (404)

**REF:** HANDOVER-2026-02-06-EDGE-FUNCTIONS-404  
**Fecha:** 2026-02-06  
**Estado:** ANÁLISIS COMPLETADO (solución pendiente para 8 funciones)

---

## 📋 Resumen Ejecutivo

Al investigar un error CORS al editar teléfonos de ejecutivos (`auth-admin-proxy`), se descubrió que **10 de 27 Edge Functions** estaban retornando 404 ("Requested function was not found") a pesar de figurar como `ACTIVE` en el Management API de Supabase. El despliegue fue corrompido/eliminado internamente.

**Causa raíz:** El código de las funciones no está presente en el runtime de Supabase, aunque la metadata (slug, verify_jwt, status) sí existe. El relay de Supabase responde 404 antes de que el código CORS se ejecute, causando el bloqueo del browser.

**Hallazgo clave:** `verify_jwt=true` **NO causa problemas CORS** en funciones correctamente desplegadas. Supabase permite el preflight OPTIONS sin importar esta configuración. El handover anterior (`2026-02-05-fix-whatsapp-duplicate-keys-cors-resources.md`) atribuyó incorrectamente el problema a `verify_jwt`.

---

## 📊 Inventario Completo de Edge Functions

### Estado de Despliegue (27 funciones registradas)

| # | Función | verify_jwt | OPTIONS | Código Local | Impacto |
|---|---------|-----------|---------|-------------|---------|
| 1 | ✅ `auth-admin-proxy` | false | 200 | `auth-admin-proxy/` | **SOLUCIONADO** (este ticket) |
| 2 | ✅ `secure-query` | false | 200 | `secure-query/` | **SOLUCIONADO** (este ticket) |
| 3 | ✅ `multi-db-proxy` | false | 200 | `multi-db-proxy/` | OK |
| 4 | ✅ `dynamics-lead-proxy` | false | 200 | `dynamics-lead-proxy/` | OK |
| 5 | ✅ `dynamics-reasignar-proxy` | false | 200 | `dynamics-reasignar-proxy/` | OK |
| 6 | ✅ `import-contact-proxy` | false | 200 | `import-contact-proxy/` | OK |
| 7 | ✅ `send-audio-proxy` | false | 200 | `send-audio-proxy/` | OK |
| 8 | ✅ `broadcast-proxy` | true | 200 | `broadcast-proxy/` | OK |
| 9 | ✅ `error-log-proxy` | true | 200 | `error-log-proxy/` | OK |
| 10 | ✅ `generar-url-optimizada` | true | 200 | `generar-url-optimizada/` | OK |
| 11 | ✅ `paraphrase-proxy` | true | 200 | `paraphrase-proxy/` | OK |
| 12 | ✅ `pause-bot-proxy` | true | 200 | `pause-bot-proxy/` | OK |
| 13 | ✅ `send-img-proxy` | true | 200 | `send-img-proxy/` | OK |
| 14 | ✅ `send-message-proxy` | true | 200 | `send-message-proxy/` | OK |
| 15 | ✅ `tools-proxy` | true | 200 | `tools-proxy/` | OK |
| 16 | ✅ `transfer-request-proxy` | true | 200 | `transfer-request-proxy/` | OK |
| 17 | ✅ `trigger-manual-proxy` | true | 200 | `trigger-manual-proxy/` | OK |
| 18 | ✅ `whatsapp-templates-send-proxy` | false | 200 | Solo backup | OK |
| 19 | ✅ `hola_mundo` | true | 200 | No local | OK (test) |
| 20 | ❌ `anthropic-proxy` | false | **404** | `anthropic-proxy/` | Ver abajo |
| 21 | ❌ `n8n-proxy` | false | **404** | Solo backup | Ver abajo |
| 22 | ❌ `whatsapp-templates-proxy` | false | **404** | Solo backup | Ver abajo |
| 23 | ❌ `timeline-proxy` | false | **404** | Solo backup | Ver abajo |
| 24 | ❌ `error-analisis-proxy` | false | **404** | Solo backup | Ver abajo |
| 25 | ❌ `agent-creator-proxy` | true | **404** | `agent-creator-proxy/` | Ver abajo |
| 26 | ❌ `cotizar-habitacion` | true | **404** | **No existe** | Ver abajo |
| 27 | ❌ `cleanup-inactive-sessions` | false | **404** | `cleanup-inactive-sessions/` | Ver abajo |

### Función Local sin Desplegar

| Función | Código Local | Registrada en Supabase |
|---------|-------------|----------------------|
| `mcp-secure-proxy` | `mcp-secure-proxy/index.ts` | **NO** (no existe en API) |

---

## 🔴 Funciones con 404 — Análisis Detallado

### 1. `whatsapp-templates-proxy` — Prioridad ALTA

**Código local:** Solo `z_backup_whatsapp-templates-proxy/` (backup, posiblemente desactualizado)  
**Patrón:** `serve()` legacy  

**Servicios afectados:**
- `src/services/whatsappTemplatesService.ts` → `createTemplateInUChat()`, `getTemplateFromUChat()`, `updateTemplateInUChat()`, `deleteTemplateInUChat()`, `syncTemplatesFromUChat()`

**Componentes afectados:**
- `WhatsAppTemplatesManager.tsx` — Gestión completa de plantillas
- `ImportWizardModal.tsx` — Importación de contactos
- `ReactivateConversationModal.tsx` — Reactivar conversaciones
- `TemplateSuggestionsTab.tsx` — Sugerencias de plantillas

**Impacto:** CRUD completo de plantillas WhatsApp inoperativo

---

### 2. `agent-creator-proxy` — Prioridad ALTA

**Código local:** `agent-creator-proxy/index.ts` (disponible)  
**Patrón:** `serve()` legacy  

**Servicios afectados:**
- `src/components/IndividualAgentWizard.tsx` línea 325 → `generateAgent()`

**Componentes afectados:**
- `IndividualAgentWizard.tsx` — Wizard de creación de agentes AI

**Impacto:** No se pueden crear agentes AI desde el wizard

---

### 3. `timeline-proxy` — Prioridad MEDIA

**Código local:** Solo `z_backup_timeline-proxy/` (backup)  
**Patrón:** `serve()` legacy  

**Servicios afectados:**
- `src/services/timelineService.ts` línea 431 → `processActivitiesWithLLM()`

**Componentes afectados:**
- `src/components/direccion/Timeline.tsx` — Módulo de Dirección/Timeline

**Impacto:** Procesamiento AI de actividades en Timeline inoperativo

---

### 4. `anthropic-proxy` — Prioridad MEDIA

**Código local:** `anthropic-proxy/index.ts` (disponible)  
**Patrón:** `serve()` legacy  

**Servicios afectados:**
- No se encontraron referencias directas en `src/`
- Documentado en `EDGE_FUNCTIONS_CATALOG.md` para `AnalysisIAComplete.tsx`

**Impacto:** Posiblemente deprecado o llamado indirectamente. Verificar uso real.

---

### 5. `n8n-proxy` — Prioridad MEDIA

**Código local:** Solo `z_backup_n8n-proxy/` (backup)  
**Patrón:** `serve()` legacy  

**Servicios afectados:**
- `src/services/n8nProxyService.ts` líneas 65, 101, 129 → `getWorkflows()`, `getWorkflow()`, `updateWorkflow()`

**Componentes afectados:**
- Ninguno directo encontrado en UI (servicio puede estar sin usar)

**Impacto:** Operaciones proxy de N8N (si se usan)

---

### 6. `error-analisis-proxy` — Prioridad BAJA

**Código local:** Solo `z_backup_error-analisis-proxy/` (backup)  
**Patrón:** `serve()` legacy  

**Servicios afectados:**
- No se encontraron referencias directas en `src/`
- Componente `CallErrorAnalysis.tsx` mencionado en docs pero no existe

**Impacto:** Probablemente deprecado

---

### 7. `cleanup-inactive-sessions` — Prioridad MEDIA

**Código local:** `cleanup-inactive-sessions/index.ts` (disponible)  
**Patrón:** `Deno.serve()` moderno  

**Servicios afectados:**
- No se llama desde frontend
- Debería ejecutarse via `pg_cron` (cron job de PostgreSQL)

**Componentes afectados:**
- Ninguno directo — proceso background

**Impacto:** Sesiones inactivas no se limpian automáticamente. Indicadores de "online" pueden mostrar datos incorrectos.

---

### 8. `cotizar-habitacion` — Prioridad BAJA

**Código local:** **No existe en el repositorio**  
**Patrón:** Desconocido  

**Servicios afectados:**
- No se encontraron referencias en `src/`

**Impacto:** Sin impacto conocido. Posiblemente función abandonada (creada julio 2025, nunca actualizada).

---

## 🔍 Patrones de Riesgo Identificados

### Patrón 1: Despliegue Fantasma

**Descripción:** Funciones listadas como `ACTIVE` en Management API pero sin código desplegado en el runtime.

**Funciones afectadas:** 8 de 27 (30%)

**Causa probable:** Los deploys se hicieron vía Management API REST (handovers previos) enviando el `body` como string. Si el bundle falló silenciosamente o Supabase purgó deployments antiguos, el código desaparece pero la metadata persiste.

**Detección:** Comparar `OPTIONS` response (404 = fantasma) vs Management API status (ACTIVE = metadata OK).

---

### Patrón 2: Código Solo en Backup

**Descripción:** 5 funciones con 404 solo tienen código en directorios `z_backup_*`, NO en el directorio principal. Si el backup está desactualizado, redeployar podría causar regresiones.

| Función | Directorio principal | Backup |
|---------|---------------------|--------|
| `whatsapp-templates-proxy` | ❌ No existe | `z_backup_whatsapp-templates-proxy/` |
| `timeline-proxy` | ❌ No existe | `z_backup_timeline-proxy/` |
| `n8n-proxy` | ❌ No existe | `z_backup_n8n-proxy/` |
| `error-analisis-proxy` | ❌ No existe | `z_backup_error-analisis-proxy/` |
| `whatsapp-templates-send-proxy` | ❌ No existe | `z_backup_whatsapp-templates-send-proxy/` |

**Riesgo:** Los backups usan `serve()` legacy y probablemente NO incluyen las correcciones recientes (migración `Deno.serve()`, headers actualizados, etc.)

---

### Patrón 3: `serve()` Legacy vs `Deno.serve()` Moderno

| Patrón | Funciones | Estado |
|--------|----------|--------|
| `Deno.serve()` nativo | 7 funciones | Moderno, recomendado |
| `import { serve } from 'deno.land/std@0.168.0'` | 14 funciones | Legacy, funciona pero vulnerable a deprecación |

**Funciones con `serve()` legacy que ESTÁN desplegadas y funcionando:**

| Función | Riesgo |
|---------|--------|
| `auth-admin-proxy` | Funciona pero usa API antigua |
| `secure-query` | Funciona pero usa API antigua |
| `tools-proxy` | Funciona |
| `transfer-request-proxy` | Funciona |
| `broadcast-proxy` | Funciona |
| `send-img-proxy` | Funciona |
| `pause-bot-proxy` | Funciona |
| `send-message-proxy` | Funciona |
| `paraphrase-proxy` | Funciona |
| `trigger-manual-proxy` | Funciona |
| `error-log-proxy` | Funciona |
| `generar-url-optimizada` | Funciona |

**Riesgo latente:** Si Supabase depreca `deno.land/std@0.168.0`, estas funciones dejarán de funcionar después de un redeploy.

---

### Patrón 4: Función Local sin Registrar

| Función | Código Local | En Supabase |
|---------|-------------|------------|
| `mcp-secure-proxy` | ✅ `mcp-secure-proxy/index.ts` | ❌ No registrada |

**Riesgo:** Si se intenta usar desde el frontend, fallará con 404.

---

## 📈 Métricas de Salud

| Métrica | Valor | Estado |
|---------|-------|--------|
| Total Edge Functions registradas | 27 | — |
| Funciones desplegadas correctamente | 19 (70%) | ⚠️ |
| Funciones con 404 (fantasma) | 8 (30%) | 🔴 |
| Funciones solucionadas hoy | 2 | ✅ |
| Funciones con código local disponible | 3 de 8 | — |
| Funciones solo con backup | 4 de 8 | ⚠️ |
| Funciones sin código local | 1 de 8 | 🔴 |
| Funciones con `serve()` legacy | 14 (52%) | ⚠️ |
| Funciones con `Deno.serve()` moderno | 7 (26%) | ✅ |

---

## 🗺️ Mapa de Impacto por Módulo

| Módulo de la App | Funciones Rotas | Funciones OK | Estado |
|-----------------|----------------|-------------|--------|
| **Administración > Usuarios** | ~~`auth-admin-proxy`~~ | — | ✅ SOLUCIONADO |
| **WhatsApp > Plantillas** | `whatsapp-templates-proxy` | `whatsapp-templates-send-proxy` | 🔴 CRUD roto |
| **WhatsApp > Chat** | — | `send-message-proxy`, `send-img-proxy`, `send-audio-proxy`, `pause-bot-proxy`, `paraphrase-proxy` | ✅ OK |
| **WhatsApp > Broadcast** | — | `broadcast-proxy` | ✅ OK |
| **Live Monitor** | — | `tools-proxy`, `transfer-request-proxy` | ✅ OK |
| **Agentes AI** | `agent-creator-proxy` | — | 🔴 Wizard roto |
| **Dirección > Timeline** | `timeline-proxy` | — | 🔴 AI processing roto |
| **Llamadas** | — | `trigger-manual-proxy` | ✅ OK |
| **Análisis** | `error-analisis-proxy` | — | ⚠️ Posiblemente deprecado |
| **N8N Proxy** | `n8n-proxy` | — | ⚠️ Sin uso directo en UI |
| **Sistema > Sesiones** | `cleanup-inactive-sessions` | — | 🔴 Limpieza automática rota |
| **Sistema > Errores** | — | `error-log-proxy` | ✅ OK |
| **Media/Audio** | — | `generar-url-optimizada` | ✅ OK |
| **Cotizaciones** | `cotizar-habitacion` | — | ⚠️ Sin referencias en código |

---

## 📋 Corrección Aplicada Hoy (2026-02-06)

### `auth-admin-proxy`
1. Detectado 404 en preflight OPTIONS
2. Se cambió `verify_jwt` a `false` via Management API (no fue la causa real)
3. Se re-desplegó con `npx supabase functions deploy auth-admin-proxy --project-ref glsmifhkoaifvaegsozd --no-verify-jwt`
4. Verificado: OPTIONS → 200, POST → 200 con datos reales

### `secure-query`
1. Detectado 404 en preflight OPTIONS  
2. Re-desplegado con `npx supabase functions deploy secure-query --project-ref glsmifhkoaifvaegsozd --no-verify-jwt`
3. Verificado: OPTIONS → 200

---

## ⚠️ Corrección del Handover Anterior

El handover `2026-02-05-fix-whatsapp-duplicate-keys-cors-resources.md` indica que `verify_jwt=true` causa problemas CORS. **Esto es INCORRECTO** según las pruebas actuales:

- `broadcast-proxy` (verify_jwt=true, deployed) → OPTIONS **200** ✅
- `send-message-proxy` (verify_jwt=true, deployed) → OPTIONS **200** ✅
- Todas las funciones con verify_jwt=true y desplegadas responden 200 al OPTIONS

**La causa real del CORS es la ausencia de código desplegado (404), NO el verify_jwt.**

---

## 🗑️ Funciones Formalmente Deprecadas

Las siguientes funciones están registradas en Supabase pero NO tienen impacto en producción.
Se mantienen como metadata en el Management API pero NO deben ser restauradas ni redeployadas.

| Función | Razón de Deprecación | Código Local | Acción |
|---------|---------------------|-------------|--------|
| `agent-creator-proxy` | Feature eliminada del producto | `agent-creator-proxy/` (obsoleto) | No restaurar |
| `cotizar-habitacion` | Sin código fuente ni referencias en codebase | No existe | No restaurar |
| `error-analisis-proxy` | Componente `CallErrorAnalysis.tsx` no existe | Solo `z_backup_` | No restaurar |
| `n8n-proxy` | Sin uso directo en UI, servicio sin consumidores | Solo `z_backup_` | No restaurar |
| `anthropic-proxy` | Sin referencias en `src/`, posiblemente reemplazada | `anthropic-proxy/` (sin uso) | No restaurar |

**Nota:** Estas funciones aparecen como `DEPRECATED` en el health check script (`scripts/edge-functions-health-check.ts`).

---

## ✅ Funciones Restauradas (2026-02-06)

### `whatsapp-templates-proxy`
- Migrada de `z_backup_` al patrón Gold Standard (`Deno.serve()` + JWT manual)
- Creado `supabase/functions/whatsapp-templates-proxy/index.ts` + `deno.json`
- Desplegada con `--no-verify-jwt`
- Verificado: OPTIONS → 200, POST sin auth → 401
- Secret: `WHATSAPP_TEMPLATES_AUTH` (ya existía)

### `timeline-proxy`
- Migrada de `z_backup_` al patrón Gold Standard (`Deno.serve()` + JWT manual)
- Creado `supabase/functions/timeline-proxy/index.ts` + `deno.json`
- Desplegada con `--no-verify-jwt`
- Verificado: OPTIONS → 200, POST sin auth → 401

### `cleanup-inactive-sessions`
- Ya usaba `Deno.serve()` moderno
- Solo requirió redeploy con `--no-verify-jwt`
- Verificado: OPTIONS → 200

---

## 🔧 Health Check Script

Se creó `scripts/edge-functions-health-check.ts` para prevenir recurrencia:

```bash
npx tsx scripts/edge-functions-health-check.ts
```

- Consulta Management API para listar funciones registradas
- Hace OPTIONS request a cada una en el runtime
- Clasifica: OK, GHOST (404 fantasma), ERROR, DEPRECATED
- Exit code 1 si hay GHOST o ERROR (útil para CI/CD)
- Ejecutar periódicamente o después de cada deploy

---

**Última actualización:** 2026-02-06 22:15 UTC
