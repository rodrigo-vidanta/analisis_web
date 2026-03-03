# Handover: Performance — Búsqueda + Virtualización LiveChat

**Fecha:** 2026-03-03
**Estado:** Implementado y verificado (pendiente deploy a AWS)
**Contexto previo:** `2026-03-03-unificacion-envio-twilio-livechat.md`

---

## Resumen

Se corrigieron 3 problemas críticos de performance en el módulo WhatsApp (LiveChatCanvas.tsx) que causaban handlers de 800-1600ms y UI inutilizable. El root cause era triple: (1) un bug en el RPC `search_dashboard_conversations` que retornaba TODAS las conversaciones al buscar por nombre, (2) falta de aislamiento entre datos de búsqueda y datos base (30+ llamadas a `setConversations` sobreescribían resultados), y (3) renderizado de 4400+ DOM nodes sin virtualización. Se agregó virtualización con `@tanstack/react-virtual`, se aisló la búsqueda en un estado separado `searchResults`, y se reescribió el scroll handler para evitar loops infinitos de carga.

---

## Problema Original

Al buscar un nombre en el módulo WhatsApp y luego borrar el filtro, el sistema acumulaba miles de conversaciones en memoria. Los ejecutivos reportaban que el sistema se "trababa" al buscar y borrar filtros. Console mostraba violations de `800-1600ms`.

### Diagnóstico Forense

Se identificaron 4 bugs interrelacionados:

| # | Bug | Impacto |
|---|-----|---------|
| 1 | **RPC `search_dashboard_conversations`**: al buscar "darig" (sin dígitos), `v_search_phone` quedaba vacío → `LIKE '%%'` matcheaba TODAS las filas → retornaba 200 (límite) en vez de 1 | Búsqueda por nombre retornaba resultados incorrectos |
| 2 | **Frontend: sin aislamiento de búsqueda**: resultados de búsqueda iban al mismo estado `conversations` que 30+ Realtime handlers, load functions, y batch processors podían sobreescribir | Resultados aparecían ~1 segundo y desaparecían |
| 3 | **Scroll check useEffect**: deps `[hasMoreConversations, loadingMoreConversations, conversations.length, allConversationsLoaded.length]` causaban re-trigger en cada batch → loop infinito de carga | Sistema cargaba 4400/7800 conversaciones innecesariamente |
| 4 | **Sin virtualización**: todas las conversaciones cargadas se renderizaban como DOM nodes | 4400+ nodes = handlers de 800-1600ms |

---

## Cambios Realizados

### 1. Fix RPC `search_dashboard_conversations` (Bug #1)

**Migración BD aplicada:** `fix_search_dashboard_phone_like_empty_string`

**Problema exacto:**
```sql
-- ANTES (bug): v_search_phone = '' para búsquedas por nombre
REGEXP_REPLACE(p.whatsapp, '[^0-9]', '', 'g') LIKE '%' || '' || '%'
-- Equivale a LIKE '%%' → matchea TODAS las filas
```

**Fix:**
```sql
-- DESPUÉS: Solo buscar por teléfono si hay al menos 3 dígitos
(LENGTH(v_search_phone) >= 3 AND REGEXP_REPLACE(COALESCE(p.whatsapp, ''), '[^0-9]', '', 'g') LIKE '%' || v_search_phone || '%')
```

**Verificación:**
- `search_dashboard_conversations('darig', ..., 200)` → Antes: **200 resultados** (el límite completo). Después: **1 resultado** ("Darig Samuel Rosales Robledo")
- `search_dashboard_conversations('3333243333', ..., 200)` → Sigue retornando 1 resultado correcto (búsqueda por teléfono no afectada)

### 2. Estado aislado `searchResults` (Bug #2)

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

**Problema:** Existían **30+ llamadas** a `setConversations` distribuidas en Realtime handlers (prospectos UPDATE, mensajes INSERT, whatsapp_provider change, prospecto_usuarios INSERT/DELETE), load functions (legacy/optimized con reset y batch), batch processors, sync functions, y context menu handlers. Cualquiera de estas podía sobreescribir los resultados de búsqueda.

**Intentos previos fallidos:**
1. Guards `if (!isInSearchModeRef.current)` en cada `setConversations` → race condition: el ref no se sincronizaba antes de que otros effects leyeran
2. Sync inmediato del ref (`isInSearchModeRef.current = true` antes de `setIsInSearchMode(true)`) → insuficiente: el aggressive loading useEffect también compartía la dependencia `debouncedSearchTerm` y corría antes del ref sync
3. Double-guard con `debouncedSearchTerm.trim().length >= 3` → aún insuficiente: otros handlers no dependían del search term

**Solución definitiva — Estado completamente aislado:**

```typescript
// NUEVO: Estado que SOLO el search useEffect toca
const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
// null = sin búsqueda activa → useMemo usa conversations
// Conversation[] = resultados activos → useMemo usa searchResults
```

**Flujo:**
```
BUSCAR "darig":
  1. isInSearchMode = true
  2. RPC search_dashboard_conversations → 1 resultado
  3. setSearchResults([resultado])          ← AISLADO, inmune a 30+ setConversations
  4. useMemo: source = searchResults        ← muestra resultado

BORRAR BÚSQUEDA:
  1. isInSearchMode = false
  2. setSearchResults(null)                 ← null = sin búsqueda
  3. useMemo: source = conversations        ← vuelve a datos base instantáneamente
```

**Cambios en `filteredConversations` useMemo:**
```typescript
// ANTES: Solo usaba conversations
let filtered = conversations.filter(...)

// DESPUÉS: Usa searchResults si hay búsqueda activa
const source = searchResults !== null ? searchResults : conversations;
let filtered = source.filter(...)
```

**Filtro local SIEMPRE activo:**
```typescript
// ANTES: Desactivaba filtro local si server "exitoso" (bug: 200 falsos positivos pasaban)
if (debouncedSearchTerm.trim() && !(isInSearchMode && serverSearchSucceededRef.current)) {

// DESPUÉS: Siempre filtrar localmente (server provee dataset ampliado, local asegura match)
if (debouncedSearchTerm.trim()) {
```

Se agregó `searchResults` a las dependencias del useMemo.

### 3. Scroll handler ref-based (Bug #3)

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

**Problema:** El `useEffect` del scroll check tenía como dependencias `[hasMoreConversations, loadingMoreConversations, conversations.length, allConversationsLoaded.length]`. Cada batch de carga cambiaba `conversations.length` y `allConversationsLoaded.length`, lo que re-disparaba el effect → verificaba scroll → cargaba otro batch → loop infinito.

**Fix:** Reescritura completa con dependencias vacías `[]` + refs:

```typescript
// Nuevos refs para lectura sin re-render
const hasMoreConversationsRef = useRef(true);
const allConversationsLoadedRef = useRef<Conversation[]>([]);

useEffect(() => {
  const scrollContainer = conversationsScrollContainerRef.current;
  if (!scrollContainer) return;

  const checkShouldLoadMore = () => {
    // Lee de REFS (no causa re-trigger)
    if (!hasMoreConversationsRef.current ||
        isLoadingConversationsRef.current ||
        isInSearchModeRef.current) return;

    const { clientHeight, scrollTop, scrollHeight } = scrollContainer;
    const scrollPct = ((scrollTop + clientHeight) / scrollHeight) * 100;
    if (scrollPct >= 75) {
      loadConversationsWrapper('', false);
    }
  };

  const handleScroll = () => {
    // Debounce 150ms
    scrollCheckTimeout = setTimeout(checkShouldLoadMore, 150);
  };

  scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  return () => scrollContainer.removeEventListener('scroll', handleScroll);
}, []); // ← Se monta UNA vez, usa refs
```

Post-load re-check agregado en los `finally` blocks de `loadConversationsLegacy` y `loadConversationsOptimized` para auto-fill cuando el contenido no llena el viewport.

### 4. Virtualización con @tanstack/react-virtual (Bug #4)

**Archivos:** `package.json`, `src/components/chat/LiveChatCanvas.tsx`

**Dependencia agregada:** `@tanstack/react-virtual`

**Implementación:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const conversationsVirtualizer = useVirtualizer({
  count: filteredConversations.length,
  getScrollElement: () => conversationsScrollContainerRef.current,
  estimateSize: () => 88,  // altura estimada ConversationItem
  overscan: 5,
  getItemKey: (index) => filteredConversations[index]?.id || String(index),
});
```

**Renderizado:** Se reemplazó el `.map()` directo por lista virtualizada con posicionamiento absoluto + `transform: translateY()`. Solo se renderizan ~20-30 items visibles en el viewport.

**Infinite scroll via virtualizer:**
```typescript
useEffect(() => {
  const lastItem = virtualItems[virtualItems.length - 1];
  if (lastItem?.index >= filteredConversations.length - 15 &&
      hasMoreConversationsRef.current &&
      !isLoadingConversationsRef.current &&
      !isInSearchModeRef.current) {
    loadConversationsWrapper('', false);
  }
}, [virtualItems, filteredConversations.length]);
```

### 5. Guards adicionales en Realtime handlers

Se mantuvo el patrón guard en handlers que REEMPLAZAN datos (no los que usan `.map()` para actualizar metadata en-place):

- Nueva conversación (Realtime): `if (!isInSearchModeRef.current) { setConversations(...) }`
- Nuevo mensaje (Realtime): mismo guard
- whatsapp_provider change: mismo guard
- Legacy/Optimized load batch: mismo guard
- Legacy/Optimized load reset: `setSearchResults(null)` para limpiar búsqueda en cambio de contexto

Los handlers que usan `.map()` o spread `[...prev]` (prospecto UPDATE metadata, requiere_atencion, nombre) NO necesitan guard porque solo modifican items existentes sin reemplazar la lista.

### 6. Aggressive loading guard

El useEffect de carga agresiva (fallback para cuando el RPC falla) se protegió con double-guard:

```typescript
// ANTES: solo ref check (race condition)
if (isInSearchModeRef.current) { return; }

// DESPUÉS: ref + check directo del search term
if (isInSearchModeRef.current || debouncedSearchTerm.trim().length >= 3) { return; }
```

---

## Archivos Modificados

| Archivo | Tipo | Detalle |
|---------|------|---------|
| `src/components/chat/LiveChatCanvas.tsx` | Frontend | Estados/refs, búsqueda aislada, scroll handler, virtualización, guards |
| `package.json` | Dependencia | +`@tanstack/react-virtual` |
| `package-lock.json` | Dependencia | Lockfile actualizado |

## Migraciones BD Aplicadas

| Nombre | Qué hizo |
|--------|----------|
| `fix_search_dashboard_phone_like_empty_string` | Fix `LIKE '%%'` en búsqueda por teléfono cuando search term no tiene dígitos. Solo aplica búsqueda por teléfono si `LENGTH(v_search_phone) >= 3`. DROP + CREATE de la función. |
| `add_whatsapp_provider_to_search_dashboard_conversations` | (Sesión anterior) Agregó `whatsapp_provider` al return type del RPC. |

---

## Resultado Medido

| Métrica | Antes | Después |
|---------|-------|---------|
| Conversaciones en DOM | 4400+ | ~20-30 (viewport) |
| Handler time | 800-1600ms | <16ms |
| RPC "darig" resultados | 200 (límite, bug) | 1 (correcto) |
| Borrar búsqueda | Acumulaba + loop carga | Restaura datos base instant (`searchResults = null`) |
| Scroll check | Loop infinito (deps re-trigger) | Un solo mount, lee refs |
| Infinite scroll | Roto por virtualización inicial | Funciona via virtualizer lastItem check |

---

## Lecciones Aprendidas

1. **`LIKE '%%'` matchea todo en PostgreSQL.** Cuando un campo de búsqueda se limpia a string vacío mediante regex (`REGEXP_REPLACE('darig', '[^0-9]', '', 'g')` → `''`), el `LIKE '%' || '' || '%'` equivale a `LIKE '%%'` que matchea cada fila. Siempre validar longitud mínima antes de aplicar LIKE.

2. **No guardar resultados de búsqueda en el mismo estado que usan 30+ handlers.** La estrategia de "guardar en conversations y guardar en allConversationsLoaded" es inherentemente frágil. La solución robusta es un estado completamente separado (`searchResults`) que solo toca el search useEffect.

3. **Los refs se sincronizan al final del ciclo de render, no inmediatamente.** `setIsInSearchMode(true)` + `useEffect(() => { ref.current = isInSearchMode }, [isInSearchMode])` NO garantiza que el ref esté actualizado cuando OTRO useEffect con la misma dependencia lee el ref en el mismo ciclo. Solución: sincronizar el ref directamente (`ref.current = true`) además de setear el state.

4. **React StrictMode en dev re-ejecuta effects en mount.** El `filterByUnreadInitRef` se seteaba a `false` en la primera ejecución, y la segunda ejecución (StrictMode) veía `false` y llamaba `loadConversationsWrapper('', true)` — un reset innecesario. No afecta producción pero genera confusión en debugging.

5. **El debug logging temporal con stack trace (`new Error().stack`) es invaluable.** Agregar un wrapper temporal a un setter con `console.warn` + stack trace identificó en 1 prueba que `loadConversationsLegacy` (reset path, triggered by StrictMode) era quien limpiaba `searchResults`. Sin esto, se habrían necesitado muchas iteraciones más.

6. **La virtualización requiere container ref consistente.** El `conversationsScrollContainerRef` debe apuntar al container con overflow-y. Si el ref cambia (unmount/remount), el virtualizer pierde la referencia. El `getScrollElement` callback lazy resuelve esto.

---

## Pendientes

- [ ] Deploy frontend a AWS (`/deploy`)
- [ ] Probar con perfil ejecutivo (no admin) — verificar que búsqueda respeta permisos
- [ ] Probar combinación de filtros (etapa + búsqueda + no leídos + etiquetas)
- [ ] Monitorear performance en producción con 50+ usuarios concurrentes
- [ ] Considerar agregar índice GIN/trigram en `prospectos.nombre_completo` si búsqueda server-side se vuelve lenta con más datos

---

## Proceso de Debugging (Referencia)

### Iteración 1: Guards en setConversations
- **Hipótesis:** Proteger cada `setConversations` con `if (!isInSearchModeRef.current)`
- **Resultado:** Falló — race condition entre search useEffect y aggressive loading useEffect (misma dependencia `debouncedSearchTerm`)

### Iteración 2: Sync inmediato de ref
- **Hipótesis:** `isInSearchModeRef.current = true` sincrónicamente antes de `setIsInSearchMode(true)`
- **Resultado:** Falló — aún había otros paths que sobreescribían

### Iteración 3: Estado aislado `searchResults`
- **Hipótesis:** Estado separado inmune a los 30+ `setConversations`
- **Resultado:** Parcial — los resultados persistían pero mostraban 200 items (el bug del RPC)

### Iteración 4: Debug logging + fix RPC
- **Hipótesis:** El RPC retorna demasiados resultados
- **Resultado:** Confirmado — `LIKE '%%'` matcheaba todo. Fix aplicado → 1 resultado correcto
- **Fix adicional:** Siempre aplicar filtro local de texto (double safety)

**Total iteraciones:** 4 | **Root causes:** 2 (RPC + aislamiento frontend)
