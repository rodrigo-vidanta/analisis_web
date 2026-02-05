# Handover: Fix Autenticación - Pérdida de Sesión y Token Management

**Fecha:** 5 de Febrero 2026  
**Sesión:** Diagnóstico y corrección de pérdida silenciosa de sesión  
**Estado:** Correcciones aplicadas, build exitoso, pendiente deploy a producción

---

## Problema Original

Los usuarios perdían el token JWT y la UI **no los deslogueaba ni obligaba a reiniciar sesión**. Se quedaban en una interfaz aparentemente funcional donde todo fallaba con errores genéricos.

---

## Diagnóstico Realizado

### Metodología
1. Análisis completo de 7 archivos core del sistema de auth
2. Consulta directa a la BD de producción via Supabase Management API
3. Análisis de `auth.sessions`, `auth.refresh_tokens`, `active_sessions`
4. Revisión de configuración de GoTrue (auth config)

### Causas Raíz Identificadas

#### CAUSA #1 (CRÍTICA): Race Condition por Doble Cliente Supabase
- `supabaseSystemUI` y `analysisSupabase` eran **dos instancias independientes** de `createClient()` apuntando al mismo proyecto PQNC_AI (`glsmifhkoaifvaegsozd`)
- Ambas tenían `autoRefreshToken: true`
- Supabase usa refresh tokens de un solo uso (`refresh_token_rotation_enabled: true`)
- Cuando un cliente refrescaba el token, **invalidaba** el refresh token del otro
- El `security_refresh_token_reuse_interval` era de solo 10 segundos
- **Evidencia:** 51.7% de refresh tokens revocados en 7 días (89 total, 46 revocados)

#### CAUSA #2: Stale Closures en AuthContext
- `handleForceLogout` capturaba `authState.user?.id` por closure
- El listener `auth:session-expired` tenía `[]` como dependencias del useEffect
- Cuando la sesión expiraba, `handleForceLogout` usaba `authState.user` del render inicial (null)
- El force logout no podía limpiar `is_operativo` ni la sesión

#### CAUSA #3: Monitor de Token Inestable
- `logout` no estaba memoizado con `useCallback`
- `useTokenExpiryMonitor` dependía de `logout` en su `useCallback`
- Cada re-render recreaba `logout` → recreaba `checkAndRefreshToken` → reiniciaba el `setInterval`
- El monitor de 5 minutos nunca completaba un ciclo

#### CAUSA #4: Sesiones Zombie Server-Side
- `sessions_timebox: 0` → sesiones nunca expiraban
- `sessions_single_per_user: false` → usuarios acumulaban múltiples sesiones
- `not_after: null` en las 43 sesiones activas
- Usuarios con hasta 5 sesiones acumuladas

#### CAUSA #5: Queries directas sin detección de auth expirado
- ~37 archivos usan `.from()` / `.rpc()` directamente
- Estos NO pasan por `authenticatedFetch` (que tiene retry de 401)
- Errores de auth se capturaban como errores de datos genéricos
- La UI nunca detectaba que era un problema de token

#### CAUSA #6: beforeunload async no funcional
- `useHeartbeat` llamaba `cleanupSession()` (async) en `beforeunload`
- El browser no espera funciones async en `beforeunload`
- `is_operativo` no se actualizaba al cerrar pestaña

---

## Correcciones Aplicadas

### Archivos Modificados

| Archivo | Cambio | Causa que resuelve |
|---------|--------|-------------------|
| `src/config/analysisSupabase.ts` | Re-exporta `supabaseSystemUI` (cliente único) | #1 |
| `src/config/supabaseSystemUI.ts` | Auth-aware fetch wrapper: intercepta 401, intenta refresh, reintenta o fuerza logout | #5 |
| `src/contexts/AuthContext.tsx` | `authStateRef` + `useCallback` en `handleForceLogout` y `logout`. Deps correctas en listener | #2, #3 |
| `src/hooks/useTokenExpiryMonitor.ts` | `logoutRef` y `userRef` estabilizan `checkAndRefreshToken`. Interval no se reinicia | #3 |
| `src/hooks/useHeartbeat.ts` | `fetch(..., { keepalive: true })` en `beforeunload`. Token en ref para uso síncrono | #6 |
| `src/hooks/useInactivityTimeout.ts` | Reemplazada llamada directa a Edge Function con `anon_key` por `supabaseSystemUI.rpc()` | Seguridad |
| `src/utils/syncSupabaseSessions.ts` | Deprecado como no-ops (innecesario con cliente único) | Limpieza |

### Configuración Server-Side (via Supabase Management API)

| Parámetro | Antes | Después | Motivo |
|-----------|-------|---------|--------|
| `sessions_timebox` | `0` | `86400` (24h) | Sesiones expiran server-side tras 24h |
| `security_refresh_token_reuse_interval` | `10s` | `30s` | Mayor margen de seguridad para refresh tokens |

### Limpieza de BD

- Eliminadas 5 sesiones zombie de `auth.sessions` (>48h sin actividad)
- Limpiados refresh tokens revocados de >48h
- Limpiadas entradas expiradas de `active_sessions`

---

## Estado Final Verificado

| Verificación | Resultado |
|-------------|-----------|
| TypeScript (`tsc --noEmit`) | ✅ Sin errores |
| Build Vite (`npm run build`) | ✅ Exitoso (20s) |
| Security scan (service_role en bundle) | ✅ Limpio |
| Linter | ✅ Sin errores |
| Config auth en Supabase | ✅ `sessions_timebox: 86400`, `reuse_interval: 30` |

---

## Pendiente

### Deploy a Producción
```bash
# Cuando estés listo:
./update-frontend.sh
```
El build ya está generado en `dist/`. Solo falta subirlo.

### site_url en Supabase
Actualmente `http://localhost:3000`. Cambiar a la URL de producción:
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/config/auth" \
  -H "Authorization: Bearer sbp_5af09660460d0f622ba75a5375a5ce5d30f1c56d" \
  -H "Content-Type: application/json" \
  -d '{"site_url": "https://TU-URL-DE-PRODUCCION.com"}'
```

### Opcional: `sessions_single_per_user`
La app ya tiene enforcement custom via `active_sessions` + realtime. Habilitarlo a nivel GoTrue (`sessions_single_per_user: true`) sería un safety net adicional server-side, pero podría interferir con la lógica custom.

---

## Guía de Pruebas

### Prueba 1: Login/Logout Básico
- Iniciar sesión → navegar módulos → cerrar sesión
- Verificar: sin errores en consola, logout limpio

### Prueba 2: Cliente Único
```javascript
// En consola del browser:
const { supabaseSystemUI } = await import('/src/config/supabaseSystemUI.ts');
const { analysisSupabase } = await import('/src/config/analysisSupabase.ts');
console.log('¿Mismo cliente?', supabaseSystemUI === analysisSupabase);
// Esperado: true
```

### Prueba 3: Force Logout
```javascript
// Disparar sesión expirada manualmente:
window.dispatchEvent(new CustomEvent('auth:session-expired', {
  detail: { reason: 'Prueba: sesión expirada' }
}));
// Esperado: toast + redirect a login
```

### Prueba 4: Cierre de Pestaña
1. Login como ejecutivo
2. Verificar `is_operativo = true` en BD
3. Cerrar pestaña (sin logout)
4. Verificar `is_operativo = false` en BD

### Prueba 5: Token Refresh (esperar 4+ horas)
- Dejar la app abierta >4 horas
- Verificar que sigue funcional (el token se refresca automáticamente)
- Si falla, el auth-aware fetch detecta el 401 y fuerza re-login

---

## Arquitectura del Flujo de Auth (Post-Fix)

```
Login
 └→ supabase.auth.signInWithPassword()
     └→ registerUniqueSession() → active_sessions (UPSERT)
     └→ loadUserData() → user_profiles_v2
     └→ useHeartbeat (cada 30s) → actualiza last_activity
     └→ useTokenExpiryMonitor (cada 5 min) → verifica/refresca token

Durante uso normal:
 └→ TODAS las queries (.from/.rpc) pasan por authAwareFetch
     └→ Si 401 → refreshSession() → retry con nuevo token
     └→ Si refresh falla → dispatch 'auth:session-expired'
         └→ AuthContext.handleForceLogout (usa authStateRef, nunca stale)
             └→ Toast + cleanup + redirect a login

Token refresh automático:
 └→ autoRefreshToken:true en supabaseSystemUI (ÚNICO cliente)
 └→ Sin race conditions (un solo GoTrueClient)

Cierre de pestaña:
 └→ beforeunload → fetch(keepalive:true)
     └→ is_operativo = false
     └→ DELETE active_sessions

Server-side safety net:
 └→ sessions_timebox: 24h → sesión expira en servidor
 └→ refresh_token_reuse_interval: 30s → margen de seguridad
```

---

## Archivos Clave para Referencia Futura

| Archivo | Propósito |
|---------|-----------|
| `src/config/supabaseSystemUI.ts` | Cliente único con auth-aware fetch |
| `src/config/analysisSupabase.ts` | Re-export del cliente único |
| `src/contexts/AuthContext.tsx` | Provider con refs anti-stale-closure |
| `src/hooks/useTokenExpiryMonitor.ts` | Monitor proactivo de expiración |
| `src/hooks/useHeartbeat.ts` | Heartbeat + cleanup keepalive |
| `src/hooks/useInactivityTimeout.ts` | Timeout 2h con RPC |
| `src/utils/authenticatedFetch.ts` | Fetch para Edge Functions con retry |
| `src/utils/authToken.ts` | Helper para obtener JWT |
| `src/services/authService.ts` | Login/logout/sesión única |

---

**Última actualización:** 5 de Febrero 2026, 14:05 UTC
