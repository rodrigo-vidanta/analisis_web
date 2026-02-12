# Handover: Fix Transcripción Realtime en Side-Widget

**Fecha:** 2026-02-12
**Sesión:** Fix regresión de transcripción en vivo tras eliminar polling
**Estado:** COMMIT PENDIENTE, DEPLOY PENDIENTE
**Versión actual en producción:** v2.14.0 (B10.1.44N2.14.0)
**Continuación de:** `2026-02-12-cpu-optimization-phase4-query-filters.md`

---

## Contexto

En la sesión anterior (CPU Optimization Phase 4), se eliminó el polling de 3 segundos del side-widget de llamadas activas (`LiveCallActivityWidget`). El widget pasó a ser 100% event-driven via Supabase Realtime.

**Resultado:** El widget muestra llamadas activas correctamente (INSERT → `debouncedLoadActiveCalls()`), pero la **transcripción no se actualizaba** durante la llamada.

## Causa raíz

El callback de Realtime en `liveActivityStore.ts` (línea 198) solo extraía **4 campos** del payload de UPDATE:

```typescript
// ANTES (incompleto)
const parsedUpdates = {
  call_status: callData.call_status,
  duracion_segundos: callData.duracion_segundos,
  datos_proceso: ...,     // JSON
  datos_llamada: ...,     // JSON
};
```

**Faltaba `conversacion_completa`** (la transcripción) y otros campos que se actualizan durante la llamada.

Con el polling de 3s, esto no era problema porque `loadActiveCalls()` hacía query completo a `live_monitor_view` y traía TODOS los campos cada 3 segundos. Sin polling, `updateCall()` incremental es el **único mecanismo de actualización** para llamadas existentes.

## Fix aplicado

**Archivo:** `src/stores/liveActivityStore.ts` (17 insertions, 11 deletions)

### Campos escalares agregados
| Campo | Propósito |
|-------|-----------|
| `checkpoint_venta_actual` | Progreso del sale pitch (CP1-CP5) |
| `resumen_llamada` | Resumen generado por IA |
| `razon_finalizacion` | Razón de fin de llamada |
| `audio_ruta_bucket` | URL de grabación |
| `nivel_interes` | Nivel de interés detectado |
| `es_venta_exitosa` | Flag de venta exitosa |

### Campos JSON (parseo seguro)
Refactorizado de bloques `if/try` individuales a loop sobre array:

```typescript
const jsonFields = ['datos_proceso', 'datos_llamada', 'conversacion_completa'] as const;
for (const field of jsonFields) {
  if (callData[field] != null) {
    try {
      parsedUpdates[field] = typeof callData[field] === 'string'
        ? JSON.parse(callData[field] as string) : callData[field];
    } catch { parsedUpdates[field] = callData[field]; }
  }
}
```

**`conversacion_completa`** es el campo clave que faltaba. Contiene la transcripción completa de la llamada que el `ExpandedCallPanel` muestra via `getTranscription()`.

## Flujo de transcripción (post-fix)

```
VAPI → N8N webhook → UPDATE llamadas_ventas.conversacion_completa
  → Supabase Realtime → RealtimeHub → liveActivityStore callback
    → parsedUpdates incluye conversacion_completa (JSON parseado)
    → updateCall() → widgetCalls actualizado
    → ExpandedCallPanel → getTranscription(call) → lee call.conversacion_completa
    → Transcripción visible en UI
```

## Verificación

- TypeScript: `npx tsc --noEmit` → sin errores
- Build: `npx vite build` → exitoso (20.46s)
- Funcional: pendiente de deploy y prueba con llamada real

## Stats BD post-Phase 4

Verificado en esta sesión (stats desde el reset):

| Query | Calls | Mean | % CPU |
|-------|-------|------|-------|
| `live_monitor_view` (v2.13.0 vieja) | 31 | 214ms | 46.5% |
| `list_changes` (Realtime - normal) | 492 | 9.5ms | 32.7% |
| `live_monitor_view` (v2.14.0 nueva) | 35 | **0.34ms** | 0.08% |

La query nueva (v2.14.0) funciona a 0.34ms. La vieja (214ms) son navegadores que aún no actualizaron. Una vez todos actualicen, `live_monitor_view` será <0.1% del CPU total.

## Para continuar

1. **DEPLOY PENDIENTE:** Solo 1 archivo modificado. Ejecutar `/deploy` para subir el fix.
2. **Verificar transcripción:** Después del deploy, abrir el widget durante una llamada activa y confirmar que la transcripción se actualiza en tiempo real.
3. **Campos adicionales a considerar:** Si hay más campos que se actualizan durante llamadas y no aparecen en el widget, agregarlos al `parsedUpdates` en el mismo patrón.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/stores/liveActivityStore.ts` | +9 campos escalares, +`conversacion_completa` JSON, refactor parseo JSON a loop |
