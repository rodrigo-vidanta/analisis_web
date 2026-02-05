# Handover: Fix WhatsApp Module - Duplicate Keys, CORS & Resource Exhaustion

**REF:** HANDOVER-2026-02-05-WHATSAPP-FIXES  
**Fecha:** 2026-02-05  
**Módulo:** WhatsApp (LiveChatCanvas), AssignmentContextMenu, Edge Functions  
**Estado:** ✅ COMPLETADO

---

## 📋 Resumen Ejecutivo

Resolución de tres problemas interrelacionados en el módulo de WhatsApp:
1. Keys duplicadas en React (conversaciones, mensajes y menú de asignación)
2. `ERR_INSUFFICIENT_RESOURCES` por exceso de fetch concurrentes y cascada de errores
3. Error CORS en `dynamics-reasignar-proxy` al reasignar ejecutivos

---

## 🐛 Problema 1: Keys Duplicadas en React

### Síntoma
```
Encountered two children with the same key, `5b8852ef-ae60-4b82-a7aa-bc4f98ee1654`
```
Múltiples UUIDs duplicados al renderizar listas de conversaciones y el menú contextual de asignación.

### Causa Raíz

**A) AssignmentContextMenu.tsx (fuente principal)**
- `loadAllEjecutivos()`: Combinaba ejecutivos + coordinadores sin deduplicar (línea ~251). Un usuario con rol coordinador que también aparece como ejecutivo generaba entradas duplicadas con el mismo `id`.
- `loadEjecutivos()`: Mismo problema al agregar coordinadores a la lista de ejecutivos (línea ~319).

**B) LiveChatCanvas.tsx (fuente secundaria)**
- `filteredConversations` no deduplicaba antes de renderizar.
- `combinedMessages` podía contener mensajes duplicados al combinar reales + cache.
- `searchInServer` y `loadConversationsWrapper` tenían deduplicación que no filtraba IDs nulos.

### Solución

**AssignmentContextMenu.tsx:**
- `loadAllEjecutivos()`: Agregada dedup con `Set` de IDs al mezclar coordinadores
- `loadEjecutivos()`: Agregada dedup con `Set` de IDs al mezclar coordinadores
- Ambas funciones: Deduplicación final con `Map(id → objeto)` antes de `setEjecutivos()`

**LiveChatCanvas.tsx:**
- `filteredConversations` (useMemo): Dedup por `id` con `Set` antes de filtrar
- `combinedMessages` (useMemo): Dedup por `id` al combinar reales + cache
- Key de mensajes: Fallback `key={message.id || \`msg-${index}\`}`
- `searchInServer` / `loadConversationsWrapper`: `.filter(Boolean)` en IDs

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/shared/AssignmentContextMenu.tsx` | Dedup ejecutivos+coordinadores |
| `src/components/chat/LiveChatCanvas.tsx` | Dedup conversaciones, mensajes, keys fallback |

---

## 🐛 Problema 2: ERR_INSUFFICIENT_RESOURCES

### Síntoma
```
POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/error-log-proxy net::ERR_INSUFFICIENT_RESOURCES
GET https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/live_monitor_view net::ERR_INSUFFICIENT_RESOURCES
```
Browser agotaba las conexiones HTTP disponibles.

### Causa Raíz
**Cascada de errores**: Cuando una petición fallaba por exceso de conexiones, `errorLogService` intentaba enviar otro fetch al webhook de errores, que también fallaba, generando más errores → loop infinito que agotaba todas las conexiones del browser.

**Múltiples pollings concurrentes** sin protección:
- `checkActiveCalls` cada 15s (LiveChatCanvas)
- `messagesInterval` cada 10s con throttle 30s
- `liveMonitorOptimizedService` con 2 queries secuenciales sin protección de concurrencia
- `liveActivityStore.loadActiveCalls` invocando todo lo anterior

### Solución

**liveMonitorOptimizedService.ts:**
- Backoff exponencial (2^n segundos, max 60s) tras errores
- Flag `_isLoading` para evitar llamadas concurrentes
- Reset de contadores en éxito
- `finally` block para limpiar flag

**errorLogService.ts:**
- Backoff exponencial en `sendToWebhook` (2^n × 2s, max 120s)
- Skip de envío cuando el error contiene `ERR_INSUFFICIENT_RESOURCES` o `Failed to fetch`
- Contadores de errores consecutivos

**LiveChatCanvas.tsx:**
- `checkActiveCalls`: Contador de errores + skip cuando `!navigator.onLine`

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `src/services/liveMonitorOptimizedService.ts` | Backoff + concurrency guard |
| `src/services/errorLogService.ts` | Backoff + skip cascade errors |
| `src/components/chat/LiveChatCanvas.tsx` | Error counter en checkActiveCalls |

---

## 🐛 Problema 3: CORS en dynamics-reasignar-proxy

### Síntoma
```
Access to fetch at '.../dynamics-reasignar-proxy' from origin 'http://localhost:5173' 
has been blocked by CORS policy: Response to preflight request doesn't pass access 
control check: It does not have HTTP ok status.
```

### Causa Raíz
La función tenía `verify_jwt: true` (default de Supabase). Cuando el browser envía la petición `OPTIONS` (preflight CORS), **no incluye header `Authorization`**, y Supabase rechaza con 401 **antes** de que el código de la función ejecute el handler de CORS.

### Solución
1. **Código actualizado**: Migrado de `serve()` (import `deno.land/std@0.168.0`) a `Deno.serve()` nativo
2. **JWT validation manual**: Eliminado import de `@supabase/supabase-js` → validación directa via `/auth/v1/user`
3. **Manejo de respuestas vacías**: Patrón robusto `text → JSON.parse` (como las otras funciones corregidas)
4. **Deploy**: `verify_jwt: false` via Management API REST

### Deploy Realizado
```bash
# 1. Cambiar verify_jwt a false
curl -X PATCH "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/functions/dynamics-reasignar-proxy" \
  -H "Authorization: Bearer sbp_..." \
  -d '{"verify_jwt": false}'

# 2. Deploy código actualizado via REST API
curl -X PATCH "...functions/dynamics-reasignar-proxy" \
  -d '{"body": "...", "verify_jwt": false}'
# Resultado: version 26, status ACTIVE

# 3. Verificación CORS preflight
curl -X OPTIONS "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/dynamics-reasignar-proxy"
# HTTP 200 ✅ con headers CORS correctos
```

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `supabase/functions/dynamics-reasignar-proxy/index.ts` | Migrado a Deno.serve() + JWT manual |

---

## 📁 Resumen de Archivos Modificados (esta sesión)

| Archivo | Tipo de Cambio |
|---------|---------------|
| `src/components/chat/LiveChatCanvas.tsx` | Dedup conversaciones/mensajes, backoff checkActiveCalls |
| `src/components/shared/AssignmentContextMenu.tsx` | Dedup ejecutivos+coordinadores |
| `src/services/liveMonitorOptimizedService.ts` | Backoff exponencial + concurrency guard |
| `src/services/errorLogService.ts` | Backoff en webhook + anti-cascade |
| `supabase/functions/dynamics-reasignar-proxy/index.ts` | Migrado a Deno.serve(), deploy con verify_jwt:false |

---

## ⚠️ Notas Importantes

1. **dynamics-reasignar-proxy** tiene `verify_jwt: false` en Supabase — la validación JWT se hace manualmente en el código de la función (via `/auth/v1/user`). La seguridad se mantiene.

2. Los archivos que aparecen en `git diff` pero NO fueron parte de esta sesión (ya venían modificados):
   - `src/config/analysisSupabase.ts`
   - `src/config/supabaseSystemUI.ts`
   - `src/contexts/AuthContext.tsx`
   - `src/hooks/useHeartbeat.ts`
   - `src/hooks/useInactivityTimeout.ts`
   - `src/hooks/useTokenExpiryMonitor.ts`
   - `src/utils/syncSupabaseSessions.ts`
   - `src/workers/audioConverter.worker.ts`
   - `supabase/functions/send-audio-proxy/index.ts`

---

**Autor:** Claude Agent  
**Revisado:** 2026-02-05
