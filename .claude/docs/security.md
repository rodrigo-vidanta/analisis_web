# Seguridad - PQNC QA AI Platform

## Reglas Criticas

1. **NUNCA** clientes `*Admin` en el codigo (todos eliminados)
2. **NUNCA** exponer `service_role_key` en frontend
3. **SOLO** `anon_key` en `.env.production`
4. **RLS habilitado** en todas las tablas con politicas basadas en `auth.uid()`
5. **Edge Functions** para operaciones privilegiadas (bypass RLS controlado)

## Patron Seguro de Acceso a Datos

```typescript
// CORRECTO: Query con RLS (usuario solo ve sus datos)
const { data } = await analysisSupabase
  .from('prospectos')
  .select('*')
  .eq('ejecutivo_id', userId);

// CORRECTO: Operacion privilegiada via Edge Function
const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-admin-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'list_users' })
});

// PROHIBIDO: Intentar bypass de RLS desde frontend
// analysisSupabaseAdmin.from('users')... ❌ NO EXISTE
```

## Vistas Seguras

- `user_profiles_v2` - Perfil sin password_hash ni datos sensibles
- NUNCA acceder directamente a `auth.users`

## Edge Functions de Seguridad

| Funcion | Proposito | Riesgo |
|---------|-----------|--------|
| `auth-admin-proxy` | CRUD usuarios, roles | ALTO |
| `secure-query` | Queries con validacion | MEDIO |
| `mcp-secure-proxy` | Proxy MCP autenticado | ALTO |
| `multi-db-proxy` | Operaciones multi-tabla | MEDIO |

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

## Checklist Pre-Deploy

- [ ] Build exitoso sin errores
- [ ] Variables de entorno correctas
- [ ] Edge Functions deployadas con secrets
- [ ] RLS policies verificadas
- [ ] Sin console.log con datos sensibles

## Modo Ninja (Suplantacion)

- Solo admins pueden activar
- Store: `ninjaStore.ts`
- OBLIGATORIO usar `useNinjaAwarePermissions` en componentes con permisos
- Pattern: `const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id`
- Visual: borde rojo pulsante, fondo oscuro
