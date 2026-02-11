# HANDOVER-2026-02-11-CPU-OPTIMIZATION-REALTIME-HUB (Fase 2)

**Fecha**: 2026-02-11 | **Version**: pre-deploy (pendiente) | **Herramienta**: Claude Code (Opus 4.6)

## Resumen de Sesion

Fase 2 de optimizacion de CPU en Supabase. CPU al 93% post-Fase 1, con `list_changes` (procesamiento WAL de Realtime) representando ~57% del CPU total (144,971 Postgres Changes Events en 3 horas, ~800/min). Se implemento un servicio centralizado RealtimeHub que reduce de N canales por tabla por usuario a 1, y se removieron 7 tablas innecesarias de la publicacion Realtime.

## Contexto: Por que Fase 2

La Fase 1 (handover `2026-02-11-cpu-optimization-live-monitor.md`) ataco `live_monitor_view` (34.2% CPU) eliminando polling agresivo. Pero `list_changes` (56.5%) seguia alto porque:

1. **20 tablas publicadas** en `supabase_realtime`, 7 innecesarias
2. **Multiples canales duplicados por usuario** a las mismas tablas (~5 canales a `llamadas_ventas`, ~4 a `mensajes_whatsapp`, ~4 a `prospectos`)
3. Cada canal genera procesamiento WAL independiente en Supabase

## Paso 1: Remover 7 tablas de publicacion Realtime (BD)

### Tablas removidas

| Tabla | Razon |
|-------|-------|
| `z_backup_auth_sessions` | Backup, nadie se suscribe |
| `z_legacy_auth_users_table_backup` | Legacy backup |
| `coordinaciones` | Datos estaticos, cambian raramente |
| `permission_groups` | Datos estaticos |
| `group_permissions` | Datos estaticos |
| `user_permission_groups` | Datos estaticos |
| `whatsapp_conversation_labels` | Sin suscripciones frontend |

### 13 tablas que permanecen

auth_user_coordinaciones, bot_pause_status, conversaciones_whatsapp, llamadas_programadas, llamadas_ventas, mensajes_whatsapp, prospectos, support_ticket_comments, support_ticket_notifications, support_tickets, system_config, user_notifications, whatsapp_campaigns

### Rollback

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  z_backup_auth_sessions, z_legacy_auth_users_table_backup,
  coordinaciones, permission_groups, group_permissions,
  user_permission_groups, whatsapp_conversation_labels;
```

## Paso 2: Limpieza de dead code

**`src/components/analysis/LiveMonitorKanban.tsx`** (-9 lineas)
- Limpiado bloque comentado de ~150 lineas de dead code Realtime (ya comentado en Fase 1)

**`src/services/liveMonitorOptimizedService.ts`** (-81 lineas)
- Removido metodo `subscribeToChanges()` — nadie lo llamaba, era dead code

## Paso 3: Crear RealtimeHub — servicio centralizado

### Archivo nuevo: `src/services/realtimeHub.ts` (228 lineas)

Servicio singleton con patron pub/sub sobre Supabase Realtime:

```
Clase: RealtimeHubService
├── channels: Map<table, RealtimeChannel>     -- 1 canal por tabla
├── listeners: Map<table, Map<event, Set<cb>>> -- callbacks por tipo
├── subscribe(table, events, callback) → unsub -- registra listener
├── cleanup()                                  -- destruye todo (logout)
├── getStats()                                 -- diagnostico
└── isConnected(table)                         -- estado del canal
```

**Dos instancias singleton:**
- `realtimeHub` — usa `analysisSupabase` (datos principales)
- `realtimeHubSystemUI` — usa `supabaseSystemUI` (sistema)

**Reglas:**
1. 1 canal por tabla por cliente Supabase
2. Canal usa `event: '*'`, filtra por eventType en JS
3. Auto-cleanup: cuando un componente se desmonta, su callback se elimina
4. Si quedan 0 callbacks para una tabla, el canal se destruye automaticamente
5. El hub NO procesa datos — entrega payload raw

## Paso 4: Migracion de componentes (8 archivos)

### Patron de migracion

**Antes:**
```typescript
const channel = analysisSupabase
  .channel(`unique-name-${Date.now()}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'llamadas_ventas' }, handler)
  .subscribe();
// cleanup: channel.unsubscribe()
```

**Despues:**
```typescript
const unsub = realtimeHub.subscribe('llamadas_ventas', 'INSERT', handler);
// cleanup: unsub()
```

### Componentes migrados

| Archivo | Tabla(s) | Eventos | Notas |
|---------|----------|---------|-------|
| `liveActivityStore.ts` | llamadas_ventas | * | Handler con grace period + debounce preservado |
| `LiveMonitor.tsx` | llamadas_ventas | INSERT, UPDATE | 2 suscripciones, mantiene polling 30s fallback |
| `LlamadasActivasWidget.tsx` | llamadas_ventas | INSERT, UPDATE | 2 suscripciones, permisos y sonido preservados |
| `ActiveCallDetailModal.tsx` | llamadas_ventas | UPDATE | **Filtro Postgres `call_id=eq.X` → filtro JS** |
| `ProspectosNuevosWidget.tsx` | prospectos, mensajes_whatsapp | INSERT, UPDATE, INSERT | 3 suscripciones |
| `ProspectosManager.tsx` | prospectos | UPDATE | Handler con permisos preservado |
| `ConversacionesWidget.tsx` | prospectos, mensajes_whatsapp | UPDATE, INSERT | Canal uchat mantenido separado (tablas no en publicacion) |
| `LiveChatCanvas.tsx` | mensajes_whatsapp, prospectos, llamadas_programadas | INSERT, UPDATE, UPDATE | Mas complejo: 3 hub subs, removida sub a `whatsapp_conversation_labels` |

### Cambio critico: ActiveCallDetailModal

El componente original usaba filtro a nivel Postgres:
```typescript
filter: `call_id=eq.${call.call_id}`
```
El hub no soporta filtros Postgres (usa `event: '*'`). Se reemplazo con filtro JS:
```typescript
const rec = payload.new as Record<string, unknown>;
if (!rec || rec.call_id !== call.call_id) return;
```

### Cambio critico: LiveChatCanvas

- Tenia canal multi-tabla con 4 suscripciones `.on()` en cadena
- Se reemplazo con 3 `realtimeHub.subscribe()` independientes
- Se elimino suscripcion a `whatsapp_conversation_labels` (tabla removida de publicacion en Paso 1)
- Logica de reconexion simplificada (hub gestiona ciclo de vida)

### Cambio critico: ConversacionesWidget

- Canal uchat (`uchat_conversations` + `uchat_messages`) mantenido como canal directo — estas tablas NO estan en `supabase_realtime` y la suscripcion probablemente ya fallaba silenciosamente
- Solo prospectos y mensajes_whatsapp migrados al hub

## Paso 5: Cleanup en AuthContext

**`src/contexts/AuthContext.tsx`** (+11 lineas)

Agregado cleanup del hub en 2 ubicaciones:
1. Handler `SIGNED_OUT` del listener de auth
2. Funcion `logout()`

```typescript
import { realtimeHub, realtimeHubSystemUI } from '../services/realtimeHub';
// En logout/signout:
realtimeHub.cleanup();
realtimeHubSystemUI.cleanup();
```

## Paso 6: Reset pg_stat_statements

Ejecutado `SELECT pg_stat_statements_reset()` a las 20:24 UTC del 2026-02-11 para baseline limpia post-cambios.

## Archivos modificados (resumen)

| Archivo | Accion | Cambio neto |
|---------|--------|-------------|
| `src/services/realtimeHub.ts` | **CREADO** | +228 lineas |
| `src/stores/liveActivityStore.ts` | Migrado | -55 / +55 |
| `src/components/analysis/LiveMonitor.tsx` | Migrado | -40 |
| `src/components/analysis/LiveMonitorKanban.tsx` | Dead code cleanup | -9 |
| `src/components/chat/LiveChatCanvas.tsx` | Migrado (mas complejo) | -255 |
| `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` | Migrado | -58 |
| `src/components/dashboard/widgets/ConversacionesWidget.tsx` | Migrado | -56 |
| `src/components/dashboard/widgets/LlamadasActivasWidget.tsx` | Migrado | -39 |
| `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` | Migrado | -53 |
| `src/components/prospectos/ProspectosManager.tsx` | Migrado | -43 |
| `src/contexts/AuthContext.tsx` | Cleanup hub | +11 |
| `src/services/liveMonitorOptimizedService.ts` | Dead code removido | -81 |
| **Total** | | -184 / +516 → **-332 neto** |

## Impacto esperado en CPU

| Metrica | Antes | Despues (estimado) |
|---------|-------|---------------------|
| Tablas en publicacion | 20 | 13 (-35%) |
| Canales por usuario a `llamadas_ventas` | ~5 | 1 (-80%) |
| Canales por usuario a `mensajes_whatsapp` | ~4 | 1 (-75%) |
| Canales por usuario a `prospectos` | ~4 | 1 (-75%) |
| `list_changes` procesadas/hora | ~800/min | ~200/min estimado (-75%) |
| Postgres Changes Events/3h | 144,971 | <40,000 estimado |
| CPU target | 93% | **<50%** |

## Verificacion

- `npm run build` — exitoso
- `npx tsc --noEmit` — exitoso, 0 errores
- Errores corregidos durante build:
  - ProspectosNuevosWidget: 3 llaves `}` extra (residuo de migracion)
  - ConversacionesWidget: 2 llaves `}` extra (residuo de migracion por agente)

## Estrategia de Rollback

### Por capas

| Si falla... | Rollback |
|-------------|----------|
| Paso 1 (BD) | 1 query SQL para re-agregar tablas (30s) |
| Paso 2 (dead code) | Sin impacto funcional |
| Pasos 3-5 (RealtimeHub) | `git revert` + redeploy desde main |

### Rollback total de emergencia (~5 min)

```bash
# 1. Frontend: redeploy main
git checkout main && ./update-frontend.sh

# 2. BD: restaurar publicacion
ALTER PUBLICATION supabase_realtime ADD TABLE
  z_backup_auth_sessions, z_legacy_auth_users_table_backup,
  coordinaciones, permission_groups, group_permissions,
  user_permission_groups, whatsapp_conversation_labels;
```

## Lo que NO se toco

- **Canales de sistema**: `bot_pause_status`, `user_notifications`, `llamadas_programadas` (excepto LiveChatCanvas), `system_config`, `whatsapp_campaigns` — se dejaron como canales directos, migrar en fase futura si necesario
- **Canal uchat en ConversacionesWidget** — tablas `uchat_conversations`/`uchat_messages` no estan en publicacion Realtime, canal separado mantenido
- **NotificationListener.tsx** — sigue comentado en MainApp.tsx (3 instancias `{/* <NotificationListener /> */}`), es intencional
- **`notificationListenerService.ts`** — servicio completo sin uso activo, candidato a eliminacion futura
- **Logica de handlers** — NINGUN handler de negocio fue modificado. Solo se cambio el mecanismo de suscripcion (canal directo → hub)

## Monitoreo post-deploy

1. **CPU Supabase dashboard**: Verificar caida de 93% a <50% en 24h
2. **Realtime metrics**: "Postgres Changes Events" debe bajar de 144K/3h a <40K/3h
3. **`pg_stat_statements`**: Verificar que `list_changes` calls/hora bajan significativamente (baseline reseteada a 20:24 UTC)
4. **Funcionalidad**:
   - Widget lateral muestra llamadas activas con Realtime
   - Dashboard widgets (LlamadasActivas, ProspectosNuevos, Conversaciones) se actualizan en tiempo real
   - Chat (LiveChatCanvas) recibe mensajes nuevos
   - ProspectosManager refleja cambios de prospectos
   - ActiveCallDetailModal muestra conversacion en vivo

## Arquitectura resultante (post Fase 1 + Fase 2)

```
                    ┌─────────────────────────┐
                    │    Supabase Realtime     │
                    │  (13 tablas publicadas)  │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──────┐ ┌────▼──────┐ ┌─────▼─────────┐
    │  realtimeHub   │ │ hub-ui    │ │ Canales       │
    │ (analysisSupa) │ │ (systemUI)│ │ directos      │
    │                │ │           │ │ (uchat, etc)  │
    │ 1 canal/tabla: │ │ (futuro)  │ └───────────────┘
    │ - llamadas_v   │ │           │
    │ - mensajes_w   │ └───────────┘
    │ - prospectos    │
    │ - llamadas_p   │
    └───────┬────────┘
            │ dispatch por eventType
    ┌───────┼───────────────────────────┐
    │       │           │               │
    ▼       ▼           ▼               ▼
 Store   Widgets    LiveChat    ProspectosManager
 (1 sub) (2-3 subs) (3 subs)   (1 sub)
```
