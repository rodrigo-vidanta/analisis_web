# HANDOVER-2026-02-12-AUTH-TOKEN-REFRESH-EDGE-FUNCTIONS

**Fecha**: 2026-02-12 | **Version**: pendiente deploy | **Herramienta**: Claude Code (Opus 4.6)

## Resumen

Migración completa de todas las llamadas a Edge Functions para usar `authenticatedEdgeFetch`/`getValidAccessToken` en lugar de `getAuthTokenOrThrow` + `fetch` manual. Esto corrige un bug donde tokens expirados no se refrescaban y el usuario no era forzado a logout, quedando en un estado "logueado pero sin sesión válida".

## Contexto

El usuario reportó error 401 al programar una llamada desde `ManualCallModal`:
```
POST .../functions/v1/trigger-manual-proxy 401 (Unauthorized)
{"error":"Authentication required","success":false}
```

La sesión se había expirado pero el frontend no renegoció el token ni forzó logout.

---

## Root Cause Analysis

### El problema: 4 capas de protección auth, todas bypaseadas

La app tiene un sistema robusto de auth con múltiples capas:

| Capa | Qué hace | Usada por ManualCallModal? |
|------|----------|--------------------------|
| `authenticatedFetch()` | Refresh proactivo + retry 401 + dispatch `auth:session-expired` | NO |
| `authAwareFetch` | Intercepta 401 en queries Supabase (`.from()`, `.rpc()`) | NO (es fetch manual) |
| `useTokenExpiryMonitor` | Checa expiración cada 5 min, force logout si falla refresh | Solo si coincide timing |
| `onAuthStateChange` | Escucha eventos de Supabase Auth | Pasivo |

`ManualCallModal` (y otros 9 archivos) usaban `getAuthTokenOrThrow()` + `fetch()` directo, bypaseando todas las capas:

1. `getAuthTokenOrThrow()` no intenta refresh proactivo
2. `fetch()` manual no tiene retry en 401
3. Error 401 no dispara `auth:session-expired` → no hay force logout
4. Usuario queda "logueado" en UI con token muerto

### La solución: `authenticatedEdgeFetch()`

Ya existía en `src/utils/authenticatedFetch.ts` pero no se usaba:

```
authenticatedEdgeFetch(functionName, { body })
  1. getValidAccessToken() → refresh proactivo si <60s de expirar
  2. fetch() con Bearer token fresco
  3. Si 401 → refreshSession() + retry una vez
  4. Si sigue 401 → dispatch 'auth:session-expired' → force logout
  5. throw Error (caller lo atrapa)
```

---

## Archivos modificados (10)

### Categoría A: Migrados a `authenticatedEdgeFetch` (6 archivos, 7 llamadas)

| Archivo | Edge Function | Cambio |
|---------|--------------|--------|
| `src/components/shared/ManualCallModal.tsx` | `trigger-manual-proxy` | `getAuthTokenOrThrow` + fetch → `authenticatedEdgeFetch` |
| `src/components/chat/ImageCatalogModal.tsx` | `send-img-proxy` | `getAuthTokenOrThrow` + fetch → `authenticatedEdgeFetch` |
| `src/components/chat/ImageCatalogModalV2.tsx` | `send-img-proxy` | `getAuthTokenOrThrow` + fetch → `authenticatedEdgeFetch` |
| `src/components/chat/media-selector/useImageCatalog.ts` | `send-img-proxy` | `getAuthTokenOrThrow` + fetch → `authenticatedEdgeFetch` |
| `src/components/chat/LiveChatCanvas.tsx` | `send-message-proxy` | `getAuthTokenOrThrow` + fetch → `authenticatedEdgeFetch` |
| `src/components/chat/LiveChatCanvas.tsx` | `send-audio-proxy` | `getAuthTokenOrThrow` + fetch → `authenticatedEdgeFetch` |

**Patrón del cambio:**
```typescript
// ANTES
import { getAuthTokenOrThrow } from '../../utils/authToken';
const authToken = await getAuthTokenOrThrow();
const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
  body: JSON.stringify(payload)
});

// DESPUÉS
import { authenticatedEdgeFetch } from '../../utils/authenticatedFetch';
const response = await authenticatedEdgeFetch('function-name', { body: payload });
```

### Caso especial: importContactService.ts

| Archivo | Edge Function | Cambio |
|---------|--------------|--------|
| `src/services/importContactService.ts` | `import-contact-proxy` | Eliminado handling manual de 401 (ahora lo maneja `authenticatedEdgeFetch`) |

Antes: `getAuthTokenOrThrow().catch(() => '')` + return custom para 401
Ahora: `authenticatedEdgeFetch` + el catch existente (línea 229) maneja throws

### Categoría B: `getValidAccessToken` + `triggerSessionExpired` (3 archivos)

| Archivo | Cambio |
|---------|--------|
| `src/services/pqncSecureClient.ts` | `getSession()` local → `getValidAccessToken()` + `triggerSessionExpired` en 401 |
| `src/services/logMonitorSecureClient.ts` | `getSession()` local → `getValidAccessToken()` + `triggerSessionExpired` en 401 |
| `src/services/multiDbProxyService.ts` | `getSession()` local → `getValidAccessToken()` + `triggerSessionExpired` en 401 |

**Patrón del cambio (getAuthToken local):**
```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabaseSystemUI.auth.getSession();
  return session?.access_token || ANON_KEY;
}

// DESPUÉS
import { getValidAccessToken, triggerSessionExpired } from '../utils/authenticatedFetch';
async function getAuthToken(): Promise<string> {
  const token = await getValidAccessToken(); // refresh proactivo <60s
  return token || ANON_KEY;
}
```

**Patrón del cambio (401 dispatch):**
```typescript
if (response.status === 401) {
  triggerSessionExpired('Sesión expirada en XxxClient'); // ← NUEVO
  return { data: null, error: { message: 'Sesión expirada...' } };
}
```

### NO modificado (correcto)

| Archivo | Razón |
|---------|-------|
| `src/services/authAdminProxyService.ts` | Usa `anon_key` intencionalmente — opera durante login cuando no hay JWT |
| `src/utils/authToken.ts` | Definición de `getAuthTokenOrThrow` se mantiene (ya no tiene consumidores en src/) |

---

## Flujo de auth ANTES vs DESPUÉS

### ANTES (token expirado):
```
Token expirado en cache
  → getAuthTokenOrThrow() devuelve token stale (sin refresh)
    → fetch manual con token muerto
      → Edge Function: 401
        → Error genérico en UI
          → auth:session-expired NUNCA se dispara
            → Usuario queda "logueado" con sesión muerta
```

### DESPUÉS (token expirado):
```
Token expirado en cache
  → getValidAccessToken() detecta <60s → refreshSession()
    → authenticatedEdgeFetch con token fresco
      → Edge Function: 200 OK ✓

Si refresh falla:
  → authenticatedEdgeFetch envía con token que tiene
    → Edge Function: 401
      → authenticatedFetch retry: refreshSession() + reintento
        → Si funciona: 200 OK ✓
        → Si falla: dispatch 'auth:session-expired' → force logout ✓
```

---

## Verificación

- `npx tsc --noEmit` → 0 errores
- `npm run build` → build exitoso en 27s
- `getAuthTokenOrThrow` ya no tiene consumidores en `src/` (solo la definición en authToken.ts)
- `authAdminProxyService.ts` NO se tocó (pre-auth operations)

## Notas importantes

1. `authenticatedEdgeFetch` agrega `Content-Type: application/json` automáticamente cuando hay body
2. `Accept: application/json` se eliminó de los headers — edge functions siempre retornan JSON
3. Los `catch` existentes en cada componente manejan throws de `authenticatedEdgeFetch` correctamente
4. `pqncSecureClient` y `logMonitorSecureClient` mantienen fallback a `anon_key` si no hay sesión (compatibilidad)
5. El dispatch de `auth:session-expired` es escuchado por `AuthContext.tsx:326-336` que ejecuta `handleForceLogout()`
