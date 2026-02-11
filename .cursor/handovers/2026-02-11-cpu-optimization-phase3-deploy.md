# HANDOVER-2026-02-11-CPU-OPTIMIZATION-PHASE3-DEPLOY

**Fecha**: 2026-02-11 | **Version**: v2.11.1 (B10.1.44N2.11.1) | **Herramienta**: Claude Code (Opus 4.6)

## Resumen

Fase 3 de optimización CPU Supabase. Auditoría completa de suscripciones Realtime pendientes, migraciones adicionales al RealtimeHub, eliminación de dead code, deploy a producción, y fix de vista materializada desfasada. CPU target: 93% → <50%.

## Handovers anteriores (leer en orden)

1. `.cursor/handovers/2026-02-11-cpu-optimization-live-monitor.md` — Fase 1: polling agresivo
2. `.cursor/handovers/2026-02-11-cpu-optimization-realtime-hub.md` — Fase 2: RealtimeHub + migraciones
3. `.cursor/handovers/2026-02-11-cpu-optimization-phase2-pending-subs.md` — Inventario de subs pendientes
4. **Este handover** — Fase 3: auditoría final + migraciones + dead code + deploy + fix MV

---

## Auditoría de 5 preguntas del handover anterior

### 1. liveMonitorKanbanOptimized.ts — ¿dead code?

**Resultado: NO es dead code, pero `subscribeToChanges()` SÍ lo es.**

- `getClassifiedCalls()` — ACTIVO, usado por `LiveMonitorKanban.tsx:2969` y `liveActivityStore.ts:327`
- `subscribeToChanges()` — DEAD CODE, solo se llamaba desde un bloque comentado (`/* ... */`) en `LiveMonitorKanban.tsx:3185-3332`

**Acción:** Eliminado `subscribeToChanges()` (~90 líneas) + import `analysisSupabase` del servicio.

### 2. Servicios de notificaciones — ¿cuántos activos?

| Servicio | Estado | Consumidores | Acción |
|----------|--------|-------------|--------|
| `notificationsService.ts` | ACTIVO | notificationStore, NotificationSystem | Mantener |
| `notificationService.ts` | ACTIVO | useNotifications hook, (NotificationListener comentado) | Mantener |
| `userNotificationService.ts` | ACTIVO | NotificationBell | Mantener |
| `notificationSoundService.ts` | ACTIVO | LlamadasActivasWidget, ConversacionesWidget, NotificationControl | Mantener |
| `notificationListenerService.ts` | **DEAD CODE** | 0 imports | **Eliminado** (~455 líneas) |
| `NotificationListener.tsx` | **DEAD CODE** | 0 imports activos (comentado en MainApp) | **Eliminado** (~168 líneas) |

**NOTA IMPORTANTE:** El agente auditor reportó erróneamente `notificationSoundService.ts` como dead code (0 imports). En realidad tiene **17+ usos activos** en 3 archivos. Fue eliminado y restaurado desde backup. **Lección: siempre verificar con Grep antes de eliminar.**

### 3. AuthContext.tsx — ¿migrar?

**Resultado: NO migrar. Corrección del handover anterior.**

- El canal `session_${userId}` escucha `active_sessions` (NO `auth_user_coordinaciones` + `system_config` como decía el handover)
- Detecta logout forzado desde otro dispositivo/admin
- Mantener como canal dedicado por seguridad (filtro SQL `user_id=eq.X` es más seguro que filtro JS)
- Volumen bajo (1 fila por usuario), impacto CPU insignificante

### 4. LlamadasProgramadasWidget.tsx — ¿migrar?

**Resultado: SÍ, migrado al hub.**

- Tenía 3 `.on()` (INSERT, UPDATE, DELETE) con canal `Date.now()` (anti-patrón)
- `llamadas_programadas` ya tenía canal hub via LiveChatCanvas
- Migrado a 3 `realtimeHub.subscribe()` separados

### 5. ¿Eliminar dead code?

**Resultado: SÍ, eliminado.**

- `notificationListenerService.ts` — eliminado (~455 líneas)
- `NotificationListener.tsx` — eliminado (~168 líneas)
- 3 refs `{/* <NotificationListener /> */}` en MainApp.tsx — eliminadas
- `subscribeToChanges()` en liveMonitorKanbanOptimized.ts — eliminado (~90 líneas)

---

## Migraciones adicionales al RealtimeHub

### bot_pause_status (2 componentes)

**Antes:** 2 canales directos con `supabaseSystemUI`, cada uno con `Date.now()` o `user_id` en el nombre.

| Componente | Antes | Después |
|------------|-------|---------|
| `ConversacionesWidget.tsx` | `supabaseSystemUI.channel('bot-pause-status-dashboard-${userId}')` + polling 5s | `realtimeHubSystemUI.subscribe('bot_pause_status', '*', ...)` + polling 30s |
| `LiveChatCanvas.tsx` | `supabaseSystemUI.channel('bot-pause-livechat-${userId}')` | `realtimeHubSystemUI.subscribe('bot_pause_status', '*', ...)` |

**Mejoras:**
- 1 canal compartido en vez de N canales por usuario
- ConversacionesWidget: polling fallback reducido de 5s a 30s
- Cleanup automático via hub (no más `removeChannel` manual)

---

## Fix: Vista materializada desfasada

### Problema reportado

ConversacionesWidget (dashboard) mostraba "27m" para una conversación cuyo último mensaje fue hace ~3 minutos. La lista aparentaba estar en el orden correcto pero con timestamps desfasados.

### Causa raíz

`mv_conversaciones_dashboard` (vista materializada) se refrescaba cada **5 minutos** (`*/5 * * * *`). En el gap entre refreshes, los timestamps podían estar hasta 5 min atrasados.

Ejemplo concreto:
- Refresh a 14:50 capturó `fecha_ultimo_mensaje = 14:26:40` (último mensaje en ese momento)
- 3 mensajes nuevos llegaron a 14:50:11, 14:50:50, 14:51:26
- Usuario cargó la página a ~14:53 → `14:53 - 14:26 = 27 min` (correcto respecto a la MV, incorrecto respecto a los datos reales)

### Fix aplicado

```sql
-- Cambio de cron: 5 min → 1 min
SELECT cron.alter_job(3, schedule := '* * * * *');
```

**Resultado:** `mv_conversaciones_dashboard` ahora se refresca cada 1 minuto. Desfase máximo reducido de 5 min a 1 min.

### Contexto: Por qué la MV existe

- ConversacionesWidget originalmente usaba una RPC que tardaba >8s (timeout)
- Se creó la vista materializada como cache para resolver el timeout
- LiveChatCanvas usa RPC `get_dashboard_conversations` (datos en vivo, sin este problema)
- El Realtime INSERT handler de ConversacionesWidget SÍ actualiza `last_message_at` correctamente (líneas 1046-1060), pero solo para mensajes que llegan DESPUÉS del load inicial

---

## Deploy

| Dato | Valor |
|------|-------|
| **Versión** | `B10.1.44N2.11.1` (patch) |
| **Commit** | `b9c47eb` |
| **AWS** | 43s (S3 + CloudFront invalidation) |
| **BD** | `force_update: true` con release notes detalladas |
| **Cron** | `mv_conversaciones_dashboard` refresh: 5 min → 1 min |

---

## Archivos modificados (Fase 3)

| Archivo | Acción | Detalle |
|---------|--------|---------|
| `src/services/liveMonitorKanbanOptimized.ts` | Editado | Eliminado `subscribeToChanges()` + import `analysisSupabase` |
| `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` | Editado | Migrado 3 subs directas → `realtimeHub.subscribe()` |
| `src/components/dashboard/widgets/ConversacionesWidget.tsx` | Editado | Migrado `bot_pause_status` → `realtimeHubSystemUI`, polling 5s→30s |
| `src/components/chat/LiveChatCanvas.tsx` | Editado | Migrado `bot_pause_status` → `realtimeHubSystemUI`, import añadido |
| `src/components/MainApp.tsx` | Editado | Eliminadas 3 refs comentadas `NotificationListener` |
| `src/services/notificationListenerService.ts` | **ELIMINADO** | Dead code (~455 líneas) |
| `src/components/notifications/NotificationListener.tsx` | **ELIMINADO** | Dead code (~168 líneas) |

**No modificados (restaurados):**
| `src/services/notificationSoundService.ts` | Restaurado | Eliminado por error, restaurado desde backup (17+ usos activos) |

---

## Mapa completo de suscripciones Realtime post-deploy

### Via RealtimeHub (21 suscripciones, 5 tablas)

| Tabla | Componentes | Eventos |
|-------|------------|---------|
| `llamadas_ventas` | liveActivityStore (*), LiveMonitor (I,U), LlamadasActivasWidget (I,U), ActiveCallDetailModal (U) | *, I, U |
| `prospectos` | ProspectosNuevosWidget (I,U), ConversacionesWidget (U), LiveChatCanvas (U), ProspectosManager (U) | I, U |
| `mensajes_whatsapp` | ProspectosNuevosWidget (I), ConversacionesWidget (I), LiveChatCanvas (I) | I |
| `llamadas_programadas` | LlamadasProgramadasWidget (I,U,D), LiveChatCanvas (U) | I, U, D |
| `system_config` | useVersionCheck (I,U) | I, U |

### Via RealtimeHubSystemUI (2 suscripciones, 1 tabla)

| Tabla | Componentes | Eventos |
|-------|------------|---------|
| `bot_pause_status` | ConversacionesWidget (*), LiveChatCanvas (*) | * |

### Canales directos restantes (intencionales)

| Archivo | Tabla(s) | Razón |
|---------|----------|-------|
| `AuthContext.tsx` | `active_sessions` | Seguridad: filtro SQL por user_id obligatorio |
| `ConversacionesWidget.tsx` | `uchat_conversations`, `uchat_messages` | Tablas NO en publicación Realtime |
| `LiveChatCanvas.tsx` | `uchat_conversations`, `uchat_messages` | Tablas NO en publicación Realtime |
| `notificationsService.ts` | `user_notifications` | Servicio con filtro por user_id |
| `notificationService.ts` | `user_notifications` | Servicio con filtro por user_id |
| `userNotificationService.ts` | `user_notifications` | Servicio con filtro por user_id |
| `ticketService.ts` | `support_ticket_notifications` | Filtro por user_id |
| `CampanasManager.tsx` | `whatsapp_campaigns` | Admin-only, bajo volumen |
| `LogDashboard.tsx` | Tabla de logs | Admin-only |
| `adminMessagesService.ts` | Admin messages | Canal con `Date.now()` |

---

## Impacto estimado total (Fase 1 + 2 + 3)

| Métrica | Antes | Después (estimado) |
|---------|-------|---------------------|
| Tablas en publicación Realtime | 20 | 13 (-35%) |
| Canales hub (por usuario) | 0 | 6 (5 analysis + 1 systemUI) |
| Canales directos eliminados | ~14+ por usuario | ~5 restantes (auth, uchat, notif) |
| `list_changes` procesadas/hora | ~800/min | ~200/min estimado (-75%) |
| Polling `bot_pause_status` | 5s | 30s (-83%) |
| MV refresh interval | 5 min | 1 min |
| Dead code eliminado | 0 | ~713 líneas |
| CPU target | 93% | **<50%** |

---

## Respaldos

Ubicación: `/Users/darigsamuelrosalesrobledo/Documents/backups/2026-02-11-cpu-optimization-phase3/`

| Archivo | Descripción |
|---------|-------------|
| `liveMonitorKanbanOptimized.ts` | Pre-eliminación de subscribeToChanges |
| `LlamadasProgramadasWidget.tsx` | Pre-migración al hub |
| `ConversacionesWidget.tsx` | Pre-migración bot_pause_status al hub |
| `LiveChatCanvas.tsx` | Pre-migración bot_pause_status al hub |
| `LiveMonitorKanban.tsx` | Pre-cambios |
| `MainApp.tsx` | Pre-eliminación de refs NotificationListener |
| `notificationListenerService.ts` | Dead code eliminado (backup completo) |
| `notificationSoundService.ts` | Eliminado por error y restaurado (backup de seguridad) |
| `NotificationListener.tsx` | Dead code eliminado (backup completo) |

---

## Rollback

### Rollback frontend (git revert + redeploy, ~5 min)
```bash
git revert b9c47eb && ./update-frontend.sh
```

### Rollback BD: restaurar tablas en publicación
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  z_backup_auth_sessions, z_legacy_auth_users_table_backup,
  coordinaciones, permission_groups, group_permissions,
  user_permission_groups, whatsapp_conversation_labels;
```

### Rollback cron: restaurar refresh 5 min
```sql
SELECT cron.alter_job(3, schedule := '*/5 * * * *');
```

---

## Monitoreo post-deploy

1. **CPU Supabase dashboard**: Target <50% en 24h (baseline: 93%)
2. **Realtime metrics**: "Postgres Changes Events" debe bajar de 144K/3h a <40K/3h
3. **`pg_stat_statements`**: Baseline reseteada a 20:24 UTC del 2026-02-11
4. **Vista materializada**: Verificar que el refresh cada 1 min no cause CPU spike
5. **Funcionalidad crítica**:
   - Dashboard widgets se actualizan en tiempo real (llamadas, prospectos, conversaciones, programadas)
   - Bot pause/resume funciona en LiveChat y Dashboard
   - LiveChatCanvas recibe mensajes nuevos
   - Side-widget muestra llamadas activas con transcripción
   - Modal de versión aparece cuando se actualiza `system_config`
   - ConversacionesWidget muestra timestamps frescos (max 1 min desfase)

---

## Lecciones aprendidas

1. **Verificar antes de eliminar:** Un agente auditor reportó `notificationSoundService.ts` como "0 imports" cuando tenía 17+. Siempre correr `Grep` manualmente antes de eliminar archivos.
2. **Handovers pueden tener errores:** El handover anterior decía que AuthContext escuchaba `auth_user_coordinaciones + system_config` cuando en realidad escucha `active_sessions`. Verificar contra el código fuente.
3. **Vistas materializadas y Realtime:** Son complementarios. La MV da carga inicial rápida, Realtime actualiza incrementalmente. El desfase de la MV es el precio de la cache.
4. **Backups fuera del proyecto:** Esencial. Salvó el `notificationSoundService.ts` que fue eliminado erróneamente.
