# Handover: CPU Optimization Phase 4 - Query Filters + Polling Elimination

**Fecha:** 2026-02-12
**Sesión:** Optimización de queries `live_monitor_view` + eliminación de polling
**Estado:** COMMIT HECHO, DEPLOY PENDIENTE
**Versión actual:** v2.13.0 (B10.1.44N2.13.0) - solo incluye filtros de fecha
**Commit pendiente de deploy:** `e760e12` - incluye TODAS las optimizaciones

---

## Contexto

Después de las Fases 1-3 (2026-02-11) que redujeron frecuencia de polling y deduplicaron canales Realtime, Supabase seguía reportando CPU >80%. Las queries a `live_monitor_view` seguían consumiendo **96.35%** del tiempo total de BD porque:

1. Cada query ejecutaba `clasificar_estado_llamada()` en **TODAS las 1,974 filas** (full scan)
2. El filtro `call_status_inteligente` es una columna computada → Postgres no puede usar índices
3. Polling de 3 segundos en el widget generaba ~33 queries/segundo con 100 usuarios

## Cambios realizados

### Deploy v2.13.0 (ya en producción)

**Archivo:** `src/services/liveMonitorOptimizedService.ts`
- Agregó filtro `fecha_llamada >= 1h` para query de llamadas activas
- Agregó filtro `fecha_llamada >= 7d` para query de llamadas recientes (después fue eliminada)
- Resultado medido: query activas pasó de **1,326ms → 0.71ms** (1,868x más rápido)

**Índices creados (migration `add_performance_indexes`):**
- `idx_content_management_created_at` ON content_management(created_at)
- `idx_llamadas_ventas_prospecto` ON llamadas_ventas(prospecto)

**Stats reseteadas:** `pg_stat_statements_reset()` ejecutado para medir desde cero

### Commit `e760e12` (PENDIENTE DE DEPLOY)

4 archivos modificados, 44 insertions, 153 deletions:

#### 1. `src/services/liveMonitorOptimizedService.ts`
- **Eliminó segunda query** (`neq('call_status_inteligente', 'activa')`) - el widget solo usa llamadas activas, la segunda query era desperdicio
- **Eliminó `getQuickStats()`** - código muerto, nadie lo llama en producción
- **Eliminó parámetro `limit`** de `getOptimizedCalls()` - ya no aplica
- Solo queda 1 query: `live_monitor_view WHERE fecha_llamada >= 1h AND (status = activa OR status_bd = activa)`

#### 2. `src/components/live-activity/LiveCallActivityWidget.tsx`
- **Eliminó polling de 3 segundos** (`setInterval(loadActiveCalls, 3000)`)
- Realtime via RealtimeHub cubre todos los escenarios:
  - Nueva llamada: INSERT → `debouncedLoadActiveCalls()` (2s debounce)
  - Update en progreso: UPDATE → `updateCall()` incremental (0 queries)
  - Llamada finaliza: UPDATE → grace period 5s → `removeCall()`

#### 3. `src/services/liveMonitorKanbanOptimized.ts`
- **Mapeó `ejecutivo_id` y `coordinacion_id`** desde la vista (antes no se extraían)
- **Eliminó `getQuickStats()` wrapper** - código muerto

#### 4. `src/stores/liveActivityStore.ts`
- **Redujo enriquecimiento de ejecutivo de 3 queries a 1:**
  - ANTES: Query prospectos (get ejecutivo_id) → Query user_profiles (get nombres) + mapa intermedio
  - AHORA: ejecutivo_id ya viene de la vista → Solo query user_profiles (get nombres)
  - Eliminó query redundante a `prospectos` tabla

## Análisis 360 del Side-Widget

### Flujo de datos completo
```
VAPI → N8N webhook → INSERT/UPDATE en llamadas_ventas
  → Supabase Realtime → RealtimeHub → liveActivityStore callback
    → Nueva llamada activa: debouncedLoadActiveCalls() (2s)
      → getClassifiedCalls() → getOptimizedCalls()
        → 1 query: live_monitor_view (activas, última 1h)
      → Filtrado permisos → Filtrado zombies → Enriquecimiento ejecutivo (1 query)
    → Update existente: updateCall() incremental (0 queries)
    → Llamada finaliza: grace period 5s → removeCall()
```

### Componentes del widget
- `LiveCallActivityWidget.tsx` - Portal en document.body, montado en MainApp
- `CallCard.tsx` - Tarjeta colapsada (nombre, checkpoint, duración, ejecutivo)
- `ExpandedCallPanel.tsx` - Panel expandido (transcripción, datos venta, info prospecto)
- `MinimizedCallTab.tsx` - Cuña en borde derecho (auto-minimiza tras 10s)

### Código muerto identificado
- `getQuickStats()` en ambos servicios → ELIMINADO
- `getActiveCalls()` en liveMonitorOptimizedService → existe pero nadie lo llama
- `getCallsByStatus()` en liveMonitorOptimizedService → existe pero nadie lo llama
- `LiveMonitorOptimizedExample.tsx` → no montado en ninguna ruta

## Métricas de impacto

### Queries live_monitor_view

| Métrica | Original (pre-Fase 4) | Después de TODO |
|---------|----------------------|-----------------|
| Queries/hora | ~30,000 | Solo por eventos Realtime (~44 llamadas/día × 100 usuarios) |
| Mean time | 1,326ms | 0.71ms |
| Queries por ciclo | 2 (activas + no-activas) | 1 (solo activas, event-driven) |
| Rows scanned | 1,974 (full table) | ~0-5 (última hora) |
| % CPU total BD | 96.35% | <0.1% |

### Queries cascade por loadActiveCalls()

| Query | Antes | Después |
|-------|-------|---------|
| live_monitor_view | 2 queries | 1 query |
| prospectos (get ejecutivo_id) | 1 query | ELIMINADA (viene de vista) |
| user_profiles_v2 (nombres) | 1 query | 1 query (sin cambio) |
| **Total por ciclo** | **4 queries** | **2 queries** |

### Polling

| Antes | Después |
|-------|---------|
| setInterval 3s por usuario | Event-driven (solo en INSERT activa) |
| ~33 queries/seg (100 users) | ~0 queries/seg (idle) |

### Estimado CPU
- **Antes:** 93-100% (live_monitor_view = 96.35% del BD time)
- **Después:** <20% estimado (live_monitor negligible, Realtime `list_changes` es el nuevo #1)

## Para continuar

1. **DEPLOY PENDIENTE:** El commit `e760e12` tiene todas las optimizaciones pero NO fue deployado. Ejecutar:
   ```bash
   tsx scripts/deploy-v2.ts --json
   ```
   Y luego actualizar BD con el SQL que genere.

2. **Monitorear post-deploy:** Verificar en Supabase Dashboard:
   - CPU debería bajar a <20%
   - `live_monitor_view` query debería desaparecer del top o estar con <1% del total
   - `list_changes` (Realtime) debería ser el #1 (~30% del total, es normal)

3. **Optimizaciones futuras opcionales:**
   - Eliminar `getActiveCalls()` y `getCallsByStatus()` (código muerto)
   - Eliminar `LiveMonitorOptimizedExample.tsx` (archivo muerto)
   - Cambiar `SELECT *` a campos específicos en la query (reduce bandwidth)
   - Índices redundantes en `llamadas_ventas` (3 en call_id) - limpieza

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/services/liveMonitorOptimizedService.ts` | -2da query, -getQuickStats, +filtro fecha 1h |
| `src/components/live-activity/LiveCallActivityWidget.tsx` | -polling 3s |
| `src/services/liveMonitorKanbanOptimized.ts` | +ejecutivo_id mapping, -getQuickStats |
| `src/stores/liveActivityStore.ts` | -2 queries redundantes ejecutivo |
| BD: migration `add_performance_indexes` | +2 índices (content_management, llamadas_ventas) |
| BD: `pg_stat_statements_reset()` | Stats reseteadas 2026-02-12 01:32 UTC |
