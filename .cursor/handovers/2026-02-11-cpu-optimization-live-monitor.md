# HANDOVER-2026-02-11-CPU-OPTIMIZATION-LIVE-MONITOR

**Fecha**: 2026-02-11 | **Version**: pre-deploy (pendiente) | **Herramienta**: Claude Code (Opus 4.6)

## Resumen de Sesion

Optimizacion critica de CPU en Supabase. La BD reportaba ~100% de uso de CPU. Se identifico que `live_monitor_view` consumia el 34.2% del CPU (2.9M queries) por polling agresivo cada 5s + cascade refetch desde el frontend. Se implementaron 3 bloques de cambios que reducen ~80% de queries a esta vista.

## Contexto: Reporte de CPU al 100%

Supabase reporto CPU critico con estas queries principales:

| Query | % CPU | Queries Totales | Origen |
|-------|-------|-----------------|--------|
| `list_changes` (Realtime) | 56.5% | 4.8M | Interno Supabase |
| `live_monitor_view` | 34.2% | 2.9M | **Frontend polling** |
| `get_conversations_ordered` | 4.3% | 371K | Legacy/N8N |
| `user_profiles_v2` | 2.3% | 199K | Frontend auth |
| Otros | 2.7% | - | - |

**Decision**: Atacar `live_monitor_view` (34.2%) ya que es controlable desde frontend.

## Bloque 1: Eliminacion de Checkpoint #5 Detection

### Que era
Sistema completo de deteccion de "checkpoint #5" (etapa de venta completada) que incluia:
- Escaneo de todas las llamadas activas buscando cambios en `checkpoint_venta_actual`
- Disparo de sonido via Web Audio API (playCheckpointCompleteSound)
- Animacion de "ringing" en el sidebar
- Auto-movimiento de llamadas a "Transferidas" al cerrar modal
- Tracking via `previousCheckpointsRef` comparando estados

### Por que se elimino
- El usuario confirmo que ya no se necesita trackear avance entre etapas
- El side-widget reemplaza la funcionalidad de alertas de llamadas nuevas
- El sonido y animacion ya no eran relevantes para el flujo actual

### Archivos modificados

**`src/stores/notificationStore.ts`** (-49 lineas)
- Removido: `ActiveCallNotification` interface
- Removido: `activeCallNotification` state
- Removido: `triggerCallNotification()` implementacion
- Removido: `clearCallNotification()` implementacion

**`src/components/Sidebar.tsx`** (-146 lineas)
- Removido: `playCheckpointCompleteSound()` (62 lineas de Web Audio API)
- Removido: useEffect completo de checkpoint #5 listener (63 lineas)
- Removido: `isRinging`, `processedCallsRef`, `isLiveActivityWidgetEnabled` states
- Removido: imports de `useNotificationStore`, `useLiveActivityStore`
- Limpiados: ternarios `isRinging` en classNames del sidebar

## Bloque 2: Tab "Llamadas Activas" comentada + Polling adaptativo

### Que se hizo
La tab "Llamadas Activas" del modulo Llamadas IA fue eliminada completamente (UI + procesos). El side-widget la reemplaza.

### Archivos modificados

**`src/components/analysis/LiveMonitorKanban.tsx`** (-590 lineas neto)

**Procesos comentados (impacto CPU critico):**
- **useEffect principal completo** (~280 lineas): Contenia `loadInitialData()`, suscripcion Realtime a `llamadas_ventas`, y polling adaptativo. Fue envuelto en `/* ... */` con documentacion.
- **Polling adaptativo** (`schedulePoll`): Implementaba `setTimeout` recursivo con intervalos de 30s (Realtime OK) / 10s (Realtime caido). Ya no ejecuta.
- **Realtime subscription** optimizada y legacy: Ya no se suscribe a cambios de `llamadas_ventas` desde este componente.
- **`groupedActiveCalls` / `horizontalRows`**: Computaciones de agrupacion por checkpoint, solo usadas por tab activa.
- **`viewedCalls` effect**: Llamaba `loadCalls()` al ver llamadas en modal.

**UI:**
- Default tab: `'active'` → `'all'`
- Tab switcher (2 buttons grid) → Header simple "Historial" con contador
- Contenido kanban por checkpoints (5 columnas) eliminado del render
- Historial siempre visible (removida condicion `selectedTab === 'all'`)
- Admin operativo: removido forced tab change a `'active'`

**NOTA IMPORTANTE**: El codigo esta COMENTADO, no eliminado. Para reactivar, descomentar el useEffect principal. El polling adaptativo que se implemento DENTRO del useEffect ya tiene la mejora de 30s/10s (no 5s original).

## Bloque 3: Fix flickering del side-widget

### Problema
Las cards del widget lateral aparecian y desaparecian durante llamadas activas.

### Causa raiz identificada
En `liveActivityStore.ts`, el handler Realtime tenia 3 problemas:

1. **`removeCall()` inmediato**: Cuando un UPDATE llegaba con `call_status !== 'activa'`, la card desaparecia instantaneamente
2. **`loadActiveCalls()` para calls nuevas**: Ejecuta ~8 queries (clasificacion + permisos + zombie + seguridad + enriquecimiento) y reemplaza TODO el array `widgetCalls`
3. **Race condition**: Durante `loadActiveCalls()` (async), el flag `isLoadingCalls` bloqueaba Realtime updates subsiguientes

### Solucion implementada

**`src/stores/liveActivityStore.ts`** (+85 lineas)

| Antes | Despues |
|-------|---------|
| `removeCall()` inmediato en status != activa | Remocion con **grace period de 5s** - confirma estado antes de remover |
| `loadActiveCalls()` para calls existentes | **Siempre `updateCall()` incremental** - sin refetch |
| `loadActiveCalls()` sin debounce para nuevas | **Debounce de 2s** - previene refetch multiplos |
| JSON sin parsear del Realtime payload | **Parseo seguro** de `datos_proceso` y `datos_llamada` |
| Sin cancelacion de timers | **Cancelacion automatica** si call vuelve a 'activa' |

### Detalles tecnicos del fix

```typescript
// Grace period: no remover inmediatamente
const REMOVAL_GRACE_MS = 5000;
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Si call vuelve a 'activa', cancelar timer de remocion
if (callData.call_status === 'activa') {
  const existingTimer = removalTimers.get(callData.call_id);
  if (existingTimer) { clearTimeout(existingTimer); removalTimers.delete(callData.call_id); }
}

// Si call ya no activa, programar remocion con grace period
// Verificar estado real antes de remover
setTimeout(() => {
  const callStill = currentState.widgetCalls.find(...);
  if (callStill && callStill.call_status !== 'activa') {
    get().removeCall(callData.call_id);
  }
}, REMOVAL_GRACE_MS);
```

## Impacto esperado en CPU

| Escenario | Antes | Despues | Reduccion |
|-----------|-------|---------|-----------|
| Queries a live_monitor_view por tab activa | 720/hora/pestana (5s poll) | **0** (tab eliminada) | **100%** |
| Queries por side-widget (Realtime UPDATE) | loadActiveCalls (~8 queries) | updateCall (0 queries) | **100% per-update** |
| Queries por side-widget (nueva call) | loadActiveCalls inmediato | Debounced 2s | **~50-80%** |
| CPU estimado de live_monitor_view | 34.2% | **~3-5%** (solo widget new calls) | **~85-90%** |

## Archivos modificados (resumen)

| Archivo | Cambio | Lineas |
|---------|--------|--------|
| `src/stores/notificationStore.ts` | Checkpoint #5 API removida | -49 |
| `src/components/Sidebar.tsx` | Sonido + animacion removidos | -146 |
| `src/components/analysis/LiveMonitorKanban.tsx` | Tab activa + procesos comentados | -590 neto |
| `src/stores/liveActivityStore.ts` | Fix flickering widget | +85 |
| `scripts/deploy-v2.ts` | Cambio pre-existente (no relacionado) | +152 |

## Verificacion

- `npm run build` — exitoso, sin errores
- `npx tsc --noEmit` — exitoso, sin errores de tipo
- Grep limpieza:
  - `previousCheckpointsRef` → removido
  - `triggerCallNotification` → removido
  - `clearCallNotification` → removido
  - `playCheckpointCompleteSound` → removido

## Lo que NO se toco

- **CHECKPOINTS constant** en LiveMonitorKanban — se usa para display UI en otros componentes
- **`checkpoint_venta_actual`** como campo de datos — sigue existiendo en BD y modelos
- **CallCard.tsx, ExpandedCallPanel.tsx, LinearLiveMonitor.tsx** — display de checkpoints en UI
- **liveMonitorKanbanOptimized.ts** — servicio de clasificacion sin cambios
- **liveMonitorOptimizedService.ts** — servicio de queries sin cambios
- **LlamadasActivasWidget.tsx** — widget dashboard sin cambios
- **Transcripcion live** — sistema separado, sin cambios

## Proxima actividad: Fase 2 — Eliminacion de cascade refetch y consolidacion Realtime

### Objetivo
Actualmente, cada vez que el side-widget recibe una llamada NUEVA via Realtime INSERT, ejecuta `loadActiveCalls()` que hace ~8 queries a la BD (clasificacion, permisos, zombie detection, validacion de seguridad, enriquecimiento con nombres de ejecutivos). Esta es la fuente del ~3-5% residual de CPU en `live_monitor_view`.

### Plan detallado

**A) Refactor `loadActiveCalls()` en `liveActivityStore.ts`:**
- Separar la logica de "obtener datos del prospecto para una llamada nueva" de "recargar TODAS las llamadas"
- Crear funcion `loadSingleCall(callId)` que haga 1-2 queries (solo la nueva llamada + su prospecto)
- En el handler Realtime INSERT: usar `loadSingleCall()` en vez de `loadActiveCalls()`
- `loadActiveCalls()` solo se usaria en `initialize()` (carga inicial) y como safety net cada ~60s

**B) Consolidar canales Realtime (opcional, Fase 3):**
- Actualmente hay multiples suscripciones a `llamadas_ventas`:
  - `live-activity-widget-realtime` en liveActivityStore
  - Canal de transcripcion live en LlamadasActivasWidget
  - Posibles canales residuales
- Consolidar en un unico canal compartido via un servicio centralizado
- Reduccion: de N canales a 1 = menos `list_changes` en Supabase (el 56.5% de CPU)

**C) Monitoreo post-deploy:**
- Comparar CPU de Supabase 24h antes vs 24h despues
- Target: `live_monitor_view` de 34.2% → <5%
- Target total: CPU de ~100% → <60%
- Si `list_changes` (56.5%) sigue alto, investigar consolidacion de canales Realtime

### Archivos a modificar (Fase 2)
- `src/stores/liveActivityStore.ts` — nueva funcion `loadSingleCall()`, refactor Realtime INSERT handler
- `src/services/liveMonitorKanbanOptimized.ts` — posible nueva funcion `getCallWithProspecto(callId)`

### Prioridad
MEDIA — los cambios de Fase 1 ya eliminan ~85-90% del problema. La Fase 2 optimiza el residual. Ejecutar despues de confirmar impacto de Fase 1 en produccion (24-48h post-deploy).
