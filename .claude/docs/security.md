# Seguridad - PQNC QA AI Platform

> Actualizado: 2026-02-13 | Verificado contra codigo real

## Reglas Criticas

1. **NUNCA** clientes `*Admin` en el codigo (todos eliminados, retornan `null`)
2. **NUNCA** exponer `service_role_key` en frontend
3. **SOLO** `anon_key` en `.env.production`
4. **RLS:** Deshabilitado en tablas directas (61 tablas). Proteccion via vistas con `security_invoker` + funciones RPC + Edge Functions
5. **Edge Functions** para operaciones privilegiadas (bypass controlado con JWT validation)

## Modelo de Seguridad Actual

```
[Frontend] → anon_key + JWT usuario
     ↓
[Supabase] → Vistas con security_invoker (protegen datos)
     ↓         RPCs con SECURITY DEFINER (ops privilegiadas)
     ↓
[Edge Functions] → service_role_key (SOLO server-side)
                   JWT validation obligatoria
                   authenticatedEdgeFetch() en frontend
```

## Patron Obligatorio: authenticatedEdgeFetch

**TODOS** los llamados a Edge Functions desde frontend DEBEN usar `authenticatedEdgeFetch()`:

```typescript
// CORRECTO: Usa refresh proactivo + retry 401 + force logout
import { authenticatedEdgeFetch } from '@/utils/authenticatedFetch';
const response = await authenticatedEdgeFetch('function-name', { body: payload });

// PROHIBIDO: fetch manual sin proteccion de token
// const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); ❌
```

`authenticatedEdgeFetch` hace:
1. `getValidAccessToken()` → refresh proactivo si <60s de expirar
2. `fetch()` con Bearer token fresco
3. Si 401 → `refreshSession()` + retry una vez
4. Si sigue 401 → dispatch `auth:session-expired` → force logout

## Vistas con Security Invoker (22 vistas)

18 vistas con `security_invoker = true` (ejecutan como el usuario que llama).

### 4 Excepciones Documentadas (SECURITY DEFINER)

| Vista | Razon |
|-------|-------|
| `user_profiles_v2` | Lee `auth.users` - authenticated no tiene GRANT directo |
| `system_config_public` | Pre-auth API publica (antes de login) |
| `app_themes_public` | Pre-auth API publica (antes de login) |
| `log_config_public` | Pre-auth API publica (antes de login) |

### Regla CRITICA: CREATE OR REPLACE VIEW

`CREATE OR REPLACE VIEW` **RESETEA** `security_invoker` a false. Siempre re-aplicar:

```sql
CREATE OR REPLACE VIEW mi_vista AS SELECT ...;
-- OBLIGATORIO inmediatamente despues:
ALTER VIEW mi_vista SET (security_invoker = true);
```

### Vistas con REVOKE anon

4 vistas con acceso revocado para anon:
- `user_profiles_v2`
- `v_prospectos_ai_config`
- `prospectos_con_ejecutivo_y_coordinacion`
- `v_whatsapp_errors_detailed`

## Edge Functions de Seguridad

| Funcion | Proposito | Riesgo |
|---------|-----------|--------|
| `auth-admin-proxy` | CRUD usuarios, roles | ALTO |
| `secure-query` | Queries con validacion + CORS whitelist | MEDIO |
| `mcp-secure-proxy` | Proxy MCP autenticado | ALTO |
| `multi-db-proxy` | Operaciones multi-tabla + CORS whitelist | MEDIO |

## Variables de Entorno

```
# .env.local (desarrollo) - NUNCA en git
VITE_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SUPABASE_ANON_KEY=...

# .env.production - NUNCA en git
# Solo anon_key, NUNCA service_role

# Secrets de Edge Functions: en Supabase Dashboard
# NUNCA en codigo ni en .env
```

## Checklist Pre-Commit

- [ ] Sin imports de `*Admin` clients
- [ ] Sin `service_role_key` en codigo
- [ ] Sin credenciales hardcodeadas
- [ ] Sin `any` en TypeScript
- [ ] `.env*` en .gitignore
- [ ] Sin datos sensibles en logs/console
- [ ] Edge Functions usan `authenticatedEdgeFetch()` (no fetch manual)

## Checklist Pre-Deploy

- [ ] Build exitoso sin errores
- [ ] Variables de entorno correctas
- [ ] Edge Functions deployadas con secrets
- [ ] Vistas con security_invoker verificadas
- [ ] Sin console.log con datos sensibles

## Modo Ninja (Suplantacion)

- Solo admins pueden activar (check `isRealAdmin`)
- Store: `ninjaStore.ts`
- OBLIGATORIO usar `useNinjaAwarePermissions` en componentes con permisos
- Pattern: `const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id`
- Visual: borde rojo pulsante, fondo oscuro
- Solo visualizacion, NO modifica datos reales
