# Handover: Rediseño Módulo Llamadas PQNC v2.0

**Fecha:** 2026-03-13
**Sesión:** Rediseño completo del módulo Llamadas PQNC
**Build:** Pending deploy (build verifica OK)

---

## Resumen Ejecutivo

Se rediseñó completamente el módulo "Llamadas PQNC" de 2,141 líneas monolíticas a una arquitectura modular con:
- Server-side pagination (eliminando el límite de 1000 registros)
- 3-tier filter system con presets
- Zustand store centralizado
- UI moderna con glassmorphism, dark mode y Framer Motion
- Bug fixes críticos (React #321, null crashes, feedback 400s)

---

## Arquitectura Implementada

### Stack Pattern
```
Types → Service → Store → Dashboard Shell → Sub-components
```

```
pqncTypes.ts ──► pqncCallsService.ts ──► pqncStore.ts ──► PQNCDashboard.tsx
                      │                                         │
                pqncSecureClient.ts                    ┌────────┼────────┐
                      │                                │        │        │
                multi-db-proxy                   Filters   Table    MetricsBar
                (Edge Function)                    │        │
                                              ActiveFilters  Pagination
```

### Archivos Creados

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `src/types/pqncTypes.ts` | ~160 | Tipos compartidos, constantes de columnas, interfaces de filtros |
| `src/services/pqncCallsService.ts` | ~230 | Funciones puras de data fetching con paginación batched |
| `src/stores/pqncStore.ts` | ~350 | Zustand store con acciones que disparan queries |
| `src/components/analysis/PQNCDashboard.tsx` | ~160 | Shell que compone sub-componentes |
| `src/components/analysis/pqnc/PQNCFiltersPanel.tsx` | ~320 | 3-tier: Primary + Advanced + Presets |
| `src/components/analysis/pqnc/PQNCActiveFilters.tsx` | ~95 | Chips dismissibles animados |
| `src/components/analysis/pqnc/PQNCMetricsBar.tsx` | ~90 | Barra compacta de métricas |
| `src/components/analysis/pqnc/PQNCCallsTable.tsx` | ~310 | Tabla con sorting, badges, row actions |
| `src/components/analysis/pqnc/PQNCPagination.tsx` | ~130 | Paginación server-side con page numbers |

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/services/pqncSecureClient.ts` | Agregado `offset` en request body |
| `supabase/functions/multi-db-proxy/index.ts` | `offset` + `range()` + operador `not` |
| `src/services/multiDbProxyService.ts` | Agregado `maybeSingle` a interfaces |
| `src/services/feedbackService.ts` | `single: true` → `maybeSingle: true, limit: 1` |
| `src/components/analysis/AnalysisDashboard.tsx` | Fix React #321 (useState → useEffect) |
| `src/components/analysis/DetailedCallView.tsx` | Null-safe: `etapa_script`, `quality_score`, props opcionales |

---

## Estrategia de UI

### Design System Tokens

**Animaciones (src/styles/tokens/animations.ts):**
- `SLIDE_UP` — Entrada de página (`y: 10→0, opacity: 0→1`)
- `COLLAPSE` — Panel expandible (`height: 0→auto, opacity: 0→1`)
- Spring chips: `stiffness: 300, damping: 25`
- Row stagger: `delay: index * 0.01`

**Colores (via Tailwind, no import directo):**
- **Primary**: Indigo — elementos interactivos, estados activos, sort indicators
- **Emerald**: Éxito, scores altos (80+), audio presente
- **Blue**: Seguimiento, scores medios (60-79)
- **Amber**: No contesta, scores bajo-medio (40-59)
- **Red**: Rechazo, scores bajos (<40), acciones destructivas
- **Purple**: Transferencia, gradiente acento en header
- **Neutral**: Estructura (borders, backgrounds, texto)

### Glassmorphism Pattern
```
bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl
border border-neutral-200 dark:border-neutral-700
rounded-xl shadow-sm
```

### Responsive Strategy
- Grid adaptativo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Columnas ocultas: `hidden md:table-cell` (Customer, Duration, Audio)
- Breakpoints principales: `sm`, `md`, `lg`, `xl`

### Component Patterns

**Dropdowns con estado activo:**
```tsx
className={filter
  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
  : 'bg-neutral-50 dark:bg-neutral-700/50 border-neutral-200 dark:border-neutral-600'}
```

**Quick buttons (toggle activo):**
```tsx
className={isActive
  ? 'bg-indigo-600 text-white shadow-sm'
  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}
```

**Result badges (color-coded):**
```tsx
function getResultBadge(result: string) {
  if (r.includes('venta')) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: '...' };
  if (r.includes('seguimiento')) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: '...' };
  // ...
}
```

**Score dots (4-tier):**
```tsx
function getScoreDot(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}
```

**Active filter chips (animated):**
```tsx
<motion.span layout
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.8, opacity: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
  className="...backdrop-blur-sm border border-indigo-200 rounded-full">
  <Icon /> {label}: {value} <X onClick={remove} />
</motion.span>
```

---

## Arquitectura de Filtros

### Server-side (11 filtros → disparan query)
| Filtro | Operador BD | Componente UI |
|--------|------------|---------------|
| dateFrom/dateTo | `.gte()/.lte()` | Date inputs + quick buttons |
| agentFilter | `.eq()` | Select searchable |
| resultFilter | `.eq()` | Select |
| organizationFilter | `.eq()` | Select |
| callTypeFilter[] | `.in()` | Multi-select |
| directionFilter[] | `.in()` | Multi-select |
| customerQualityFilter[] | `.in()` | Multi-select |
| qualityScoreMin/Max | `.gte()/.lte()` | Number inputs |
| hasAudio | `.not('is', null)` / `.is(null)` | 3-state toggle |

### Client-side (5 filtros → solo página actual)
| Filtro | Lógica | Componente UI |
|--------|--------|---------------|
| searchQuery | `.toLowerCase().includes()` en 7 campos | Input debounced 300ms |
| durationRange | Parse → short/med/long | 3-state toggle |
| requiresFollowup | JSON nested field | Toggle |
| serviceOffered | JSON array field | Multi-select |
| bookmarkColor | Separate Map lookup | Color picker |

### Data Flow de un cambio de filtro
```
1. Usuario cambia filtro → onServerFilterChange(key, value)
2. Store.setServerFilter → setState + resetPage(1) + clearPreset
3. Store dispara fetchCalls() + fetchMetrics() en paralelo
4. Service construye query con applyServerFilters()
5. pqncSecureClient envía POST a multi-db-proxy con JWT
6. Edge Function valida JWT + tabla permitida
7. Ejecuta query en PQNC_QA con service_role key
8. Retorna { data, count, error }
9. Store actualiza calls, totalRecords
10. PQNCCallsTable aplica filtros client-side via useMemo, renderiza
```

---

## Paginación Server-Side

### Estrategia
```typescript
// Service
const offset = (page - 1) * pageSize;
query.range(offset, offset + pageSize - 1);  // Supabase range

// Parallel count query
query.select('*', { count: 'exact', head: true });

// Edge Function maps to Supabase
if (offset && limit) query.range(offset, offset + limit - 1);
```

### Métricas: Batch Pagination
```typescript
// Para evitar el límite de 1000 rows en agregaciones:
while (offset < totalCount) {
  const batch = await query.range(offset, offset + 999);
  allRecords.push(...batch);
  offset += 1000;
}
// Compute averages on all records
```

---

## Presets System

### Built-in (3)
```typescript
{ id: 'today', name: 'Hoy', filters: { dateFrom: today, dateTo: today } }
{ id: 'weekly-review', name: 'Revision Semanal', filters: { dateFrom: startOfWeek, qualityScoreMax: 50, hasAudio: true } }
{ id: 'best-calls', name: 'Mejores Llamadas', filters: { dateFrom: startOfMonth, qualityScoreMin: 85 } }
```

### Custom presets
- Guardados en `localStorage('pqnc-filter-presets')`
- Save: snapshot de todos los filtros actuales + nombre
- Delete: solo custom, built-in protegidos
- Built-in dates recalculados dinámicamente en cada apply

---

## Bug Fixes

| Bug | Archivo | Root Cause | Fix |
|-----|---------|-----------|-----|
| React Error #321 | AnalysisDashboard.tsx:69 | `canAccessSubModule()` en useState initializer | Movido a useEffect |
| null.toFixed() | DetailedCallView.tsx:806 | `quality_score` null en BD | `?? 0` |
| null.toLowerCase() | DetailedCallView.tsx:440 | `etapa_script` null en BD | `\|\| ''` |
| null.replace() | DetailedCallView.tsx:656 | `etapa_script` null | `\|\| 'sin_etapa'` |
| 400 feedback | feedbackService.ts:175 | `single: true` con 0 rows | `maybeSingle: true, limit: 1` |
| 1000 limit métricas | pqncCallsService.ts | Supabase default limit | Count query + batched fetch |
| Timezone fecha | PQNCCallsTable.tsx | Sin timezone en formatDate | `America/Mexico_City` |
| Duration HH:MM:SS.ms | PQNCCallsTable.tsx | No manejaba milisegundos | `parseFloat` en tercer campo |

---

## Pendientes

1. **Deploy Edge Function** — `multi-db-proxy` necesita redeploy para `offset` y `not` (cambio backward-compatible, página 1 funciona sin deploy)
2. **Data quality** — Campo `duration` en PQNC_QA no coincide con duración real del audio (ej: BD dice 3:59, audio es 0:54). Ingeniero de BD investigando.
3. **Schema BD** — Ingeniero preparando esquema actualizado de PQNC_QA
4. **Legacy cleanup** — `PQNCDashboard.legacy.tsx` puede eliminarse cuando se confirme estabilidad

---

## Cómo Replicar Esta Estrategia en Otro Módulo

### Paso 1: Types
Crear `src/types/{module}Types.ts` con:
- Record interface (list columns vs detail columns)
- ServerFilters interface (lo que va al backend)
- ClientFilters interface (lo que filtra en memoria)
- ActiveFilter para chips
- PaginatedResult<T> genérico
- Constants de columnas SELECT

### Paso 2: Service
Crear `src/services/{module}Service.ts` con:
- `applyServerFilters()` helper reutilizable
- `fetchItems()` con data + count queries en paralelo
- `fetchDetail()` con columnas extendidas
- `fetchFilterOptions()` con paginación batched para opciones únicas
- `fetchMetrics()` con count exacto + batches para aggregates

### Paso 3: Store (Zustand)
Crear `src/stores/{module}Store.ts` con:
- Estado: data, pagination, sort, serverFilters, clientFilters, filterOptions, presets, UI, metrics
- Acciones que disparan service calls directamente (no useEffect watchers)
- `setServerFilter` → resetPage + fetchCalls + fetchMetrics
- `setClientFilter` → solo setState (no server trip)
- `getActiveFilters()` → derivado puro para chips
- Presets con localStorage persistence

### Paso 4: Dashboard Shell
Crear componente shell que:
- Destructura TODO del store
- Compone sub-componentes pasando solo props necesarios
- useEffect inicial: fetchCalls + fetchMetrics + fetchFilterOptions
- useEffect[data]: loadFeedbacks

### Paso 5: Sub-componentes
- **FiltersPanel**: Tier 1 (always visible, 4-col grid) + Tier 2 (collapsible COLLAPSE) + Presets (scrollable row)
- **ActiveFilters**: AnimatePresence + layout chips con spring
- **MetricsBar**: Compact horizontal con divide-x, tabular-nums
- **Table**: React.memo, AnimatePresence rows, sortable headers, result badges, responsive hidden cols
- **Pagination**: Server-side, page numbers con ellipsis, page size selector

### Paso 6: Glass morphism everywhere
```
bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl
border border-neutral-200 dark:border-neutral-700
rounded-xl shadow-sm overflow-hidden
```
