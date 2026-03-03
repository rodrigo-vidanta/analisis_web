# Fix: Thundering Herd en useEffectivePermissions — ERR_INSUFFICIENT_RESOURCES

**Fecha**: 2026-03-03
**Severidad**: Critica (app inutilizable)
**Archivos modificados**: 2
**Estado**: Implementado, pendiente deploy

---

## Sintoma reportado

En el modulo de WhatsApp (LiveChat), la aplicacion se alentaba severamente con estos errores en consola:

```
[Violation] Forced reflow while executing JavaScript took 47ms
[Violation] 'animationcancel' handler took 271ms
[Violation] 'setInterval' handler took 61ms (x3)

GET .../user_permission_groups?... net::ERR_INSUFFICIENT_RESOURCES
Error obteniendo grupos del usuario: TypeError: Failed to fetch
```

El error `getUserGroups` se repetia **miles de veces**, generando un loop infinito de requests fallidas.

---

## Diagnostico: Causa Raiz

### El problema: "Thundering Herd" (estampida de requests)

`useEffectivePermissions` es un hook usado en **40+ componentes** a lo largo de la app. Cuando el usuario navega al modulo de WhatsApp, muchos de estos componentes se montan **simultaneamente**.

**Flujo del bug**:

```
1. Componente A monta → loadGroups() → cache vacio → FETCH getGroups + getUserGroups
2. Componente B monta → loadGroups() → cache SIGUE vacio (A no termino) → NUEVO FETCH
3. Componente C monta → idem → NUEVO FETCH
4. ... 40+ componentes hacen lo mismo ...
5. Total: 80+ requests paralelas (getGroups + getUserGroups por cada instancia)
```

Estas 80+ requests, sumadas a:
- 4-5 suscripciones Realtime (WebSocket)
- 4 setIntervals activos en LiveChatCanvas (polling mensajes, llamadas, bot pause, busqueda)
- Requests normales de carga de conversaciones

**Agotan el pool de conexiones del navegador** → `ERR_INSUFFICIENT_RESOURCES`

### La cascada infinita

```
80+ requests → ERR_INSUFFICIENT_RESOURCES → TODAS fallan
→ Cache NUNCA se llena (solo se llena en success)
→ Cualquier re-render intenta fetchear de nuevo
→ Sigue fallando → loop infinito de errores
```

### Agravante: getGroups() es N*2 pesada

`groupsService.getGroups()` no solo consulta `permission_groups`, sino que ademas hace **N * 2 queries adicionales** (conteo de usuarios + conteo de permisos por cada grupo). Si hay 8 grupos, son 1 + 16 = **17 queries por cada llamada a getGroups**. Con 40 componentes simultaneos = **680+ queries** antes de que el cache se llene.

---

## Solucion implementada

### Tres capas de proteccion:

### Capa 1: Deduplicacion en `useEffectivePermissions` (shared promise)

```typescript
// ANTES: Cada instancia del hook lanzaba su propia request
const groups = await groupsService.getGroups(true);
const userAssignments = await groupsService.getUserGroups(user.id);

// DESPUES: Promesa compartida — 40 componentes, 1 sola request
if (_inFlightPromise) {
  const result = await _inFlightPromise;  // Esperar la misma promesa
  // ... usar resultado
  return;
}
_inFlightPromise = (async () => { /* fetch real */ })();
const result = await _inFlightPromise;
```

**Impacto**: 80+ requests → 2 requests (1 getGroups + 1 getUserGroups)

### Capa 2: Error cooldown (10 segundos)

```typescript
// Si un fetch falla, activar cooldown para NO reintentar inmediatamente
if (now < _errorCooldownUntil) {
  setUserGroups(cachedUserGroups.get(user.id) || []);  // Usar lo que haya en cache
  setLoading(false);
  return;  // No hacer requests durante el cooldown
}

// En el catch:
_errorCooldownUntil = Date.now() + ERROR_COOLDOWN_MS;  // 10s
```

**Impacto**: Rompe el loop infinito de reintentos. Si la red se satura, espera 10s antes de reintentar.

### Capa 3: Deduplicacion en `groupsService` (nivel de servicio)

```typescript
// getUserGroups: si ya hay fetch in-flight para este userId, reusar
async getUserGroups(userId: string) {
  const existing = this._getUserGroupsPromises.get(userId);
  if (existing) return existing;  // Reusar promesa existente

  const promise = this._fetchUserGroups(userId);
  this._getUserGroupsPromises.set(userId, promise);
  try { return await promise; }
  finally { this._getUserGroupsPromises.delete(userId); }
}

// getGroups: mismo patron
async getGroups(includeSystem = true) {
  if (this._getGroupsPromise) return this._getGroupsPromise;
  // ...
}
```

**Impacto**: Protege tambien las llamadas directas a `groupsService` desde otros componentes (AdminDashboardTabs, UserManagement, etc.) que no pasan por `useEffectivePermissions`.

---

## Archivos modificados

### `src/hooks/useEffectivePermissions.ts`
- Variables globales: `_inFlightPromise`, `_errorCooldownUntil`, `ERROR_COOLDOWN_MS`
- `loadGroups()`: Reescrito con 3 etapas: cache check → cooldown check → deduplicacion → fetch compartido
- Error handler: Ahora activa cooldown en vez de reintentar silenciosamente

### `src/services/groupsService.ts`
- Propiedades privadas: `_getGroupsPromise`, `_getUserGroupsPromises`
- `getGroups()` → delega a `_fetchGroups()` con deduplicacion
- `getUserGroups()` → delega a `_fetchUserGroups()` con deduplicacion por userId

---

## Metricas de impacto

| Metrica | Antes | Despues |
|---------|-------|---------|
| Requests simultaneas al montar WhatsApp | 80+ (40 componentes × 2) | 2 (1 getGroups + 1 getUserGroups) |
| Queries Supabase por mount | 680+ (17 × 40 componentes) | 17 (1 sola invocacion) |
| Reintentos tras error de red | Infinitos (loop) | 0 durante 10s cooldown |
| Tiempo de bloqueo main thread | ~270ms+ (forced reflow) | Minimo (1 request en vez de 80) |

---

## Contexto: Puntos de presion de conexiones en WhatsApp module

El modulo de WhatsApp/LiveChat es el mas pesado de la app en terminos de conexiones:

1. **Realtime**: 4-5 canales (mensajes INSERT, mensajes UPDATE, prospectos UPDATE, llamadas, bot_pause)
2. **setIntervals activos**:
   - Polling mensajes cada 10s (throttled a 30s real) — linea 3520
   - Check llamadas activas cada 15s — linea 2001
   - Bot pause timer cada ~5s — linea 3851
   - Busqueda agresiva cada 2s (solo activo durante busqueda) — linea 1907
3. **Componentes con useEffectivePermissions**: LiveChatModule, LiveChatCanvas, QuickImportModal, ImportWizardModal, CallDetailModalSidebar + componentes globales (Header, Sidebar, MainApp, etc.)

---

## Notas importantes

- **`allGroups` state**: Variable declarada pero nunca leida (warning TS pre-existente, no introducido por este fix)
- **El cache TTL sigue en 1 minuto**: Suficiente para la sesion, pero `refresh()` lo invalida explicitamente cuando se necesita
- **StrictMode de React**: En desarrollo, React monta/desmonta componentes 2x, duplicando el problema. En produccion es 1x, pero con 40+ componentes sigue siendo critico
- **getGroups con conteos**: La funcion `getGroups()` hace N*2 queries extra (conteos por grupo). Esto es un candidato a optimizacion futura (RPC con aggregates o vista materializada)
- **consoleInterceptors.ts**: Ya tenia filtros para silenciar logs de `getUserGroups`, pero eso solo ocultaba el sintoma, no la causa

---

## Testing

- TypeScript: `npx tsc --noEmit` — sin errores
- Verificar en browser: Abrir modulo WhatsApp, revisar Network tab — debe haber maximo 2 requests a `user_permission_groups` y `permission_groups` en vez de docenas
- Verificar que `ERR_INSUFFICIENT_RESOURCES` no aparece
- Verificar que permisos funcionan correctamente (isAdmin, isCoordinador, etc.)
