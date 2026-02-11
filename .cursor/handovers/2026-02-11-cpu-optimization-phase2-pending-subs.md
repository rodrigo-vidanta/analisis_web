# HANDOVER-2026-02-11-CPU-OPTIMIZATION-PHASE2-PENDING-SUBS

**Fecha**: 2026-02-11 | **Version**: pre-deploy (NO deployado) | **Herramienta**: Claude Code (Opus 4.6)

## Resumen

Continuacion de la optimizacion CPU Supabase (93%). Fase 2 completada (RealtimeHub + migracion de componentes principales). Se agrego migracion adicional de `useVersionCheck.ts` al hub. Falta auditar y decidir sobre ~15 suscripciones Realtime directas restantes antes de deploy.

## Estado actual

### Build
- `npm run build` — exitoso
- `npx tsc --noEmit` — exitoso, 0 errores

### BD ya aplicada
- 7 tablas removidas de `supabase_realtime` (13 quedan)
- `pg_stat_statements` reseteado a las 20:24 UTC

### Codigo NO deployado
Todo esta en working tree de `main`, sin commit ni deploy.

## Handovers anteriores (leer en orden)

1. `.cursor/handovers/2026-02-11-cpu-optimization-live-monitor.md` — Fase 1: polling agresivo
2. `.cursor/handovers/2026-02-11-cpu-optimization-realtime-hub.md` — Fase 2: RealtimeHub + migraciones

## Cambio adicional: useVersionCheck.ts migrado al hub

**Archivo**: `src/hooks/useVersionCheck.ts`

| Aspecto | Antes | Despues |
|---------|-------|---------|
| Canal | `version_check_${Date.now()}` (unico por usuario) | `realtimeHub.subscribe('system_config', ...)` |
| Eventos | 2 `.on()` encadenados (UPDATE + INSERT) | 1 `realtimeHub.subscribe(['INSERT', 'UPDATE'])` |
| Filtro | Postgres `config_key=eq.app_version` | JS `rec?.config_key === 'app_version'` |
| Polling | 30s (fallback a 60s si Realtime OK) | 60s fijo (solo backup) |

## Suscripciones YA migradas al RealtimeHub (10 componentes)

| Componente | Tabla(s) | Eventos |
|-----------|----------|---------|
| `liveActivityStore.ts` | llamadas_ventas | * |
| `LiveMonitor.tsx` | llamadas_ventas | INSERT, UPDATE |
| `LlamadasActivasWidget.tsx` | llamadas_ventas | INSERT, UPDATE |
| `ActiveCallDetailModal.tsx` | llamadas_ventas | UPDATE |
| `ProspectosNuevosWidget.tsx` | prospectos, mensajes_whatsapp | INSERT, UPDATE, INSERT |
| `ProspectosManager.tsx` | prospectos | UPDATE |
| `ConversacionesWidget.tsx` | prospectos, mensajes_whatsapp | UPDATE, INSERT |
| `LiveChatCanvas.tsx` | mensajes_whatsapp, prospectos, llamadas_programadas | INSERT, UPDATE, UPDATE |
| `useVersionCheck.ts` | system_config | INSERT, UPDATE |

## Suscripciones Realtime directas RESTANTES (pendientes de auditar)

### Categoria A: Candidatos a migrar al hub (tablas en publicacion)

| # | Archivo | Linea | Canal | Tabla(s) | Notas |
|---|---------|-------|-------|----------|-------|
| 1 | `userNotificationService.ts` | 382 | `.channel(channelName)` | `user_notifications` | Servicio de notificaciones push |
| 2 | `notificationsService.ts` | 195 | `.channel(channelName)` | Probable `user_notifications` | Otro servicio de notificaciones |
| 3 | `notificationService.ts` | 283, 342, 407 | 3 canales separados | Varias tablas de notificaciones | TRES canales, alto impacto |
| 4 | `ticketService.ts` | 955 | `.channel(`notifications-${userId}`)` | `support_ticket_notifications` | Notificaciones de tickets |
| 5 | `LlamadasProgramadasWidget.tsx` | 113 | `.channel(channelName)` | `llamadas_programadas` | 3 `.on()` postgres_changes |
| 6 | `CampanasManager.tsx` | 276 | `.channel('whatsapp_campaigns_changes')` | `whatsapp_campaigns` | Canal por tabla de campanas |
| 7 | `AuthContext.tsx` | 212 | `.channel(`session_${userId}`)` | `auth_user_coordinaciones`, `system_config` | Canal multi-tabla de sesion |
| 8 | `LogDashboard.tsx` | 550 | `.channel('error_logs_realtime')` | Probable tabla de logs | Admin-only |
| 9 | `adminMessagesService.ts` | 342 | `.channel(`admin_messages_${role}_${Date.now()}`)` | Tabla admin messages | Usa `Date.now()` = canal unico |
| 10 | `liveMonitorKanbanOptimized.ts` | 330 | `.channel(`kanban_optimized_realtime_${Date.now()}`)` | `llamadas_ventas` (4 suscripciones) | **VERIFICAR** si es dead code |

### Categoria B: Intencionales (tablas NO en publicacion)

| # | Archivo | Linea | Tabla(s) | Notas |
|---|---------|-------|----------|-------|
| 1 | `ConversacionesWidget.tsx` | 159, 424, 461, 673 | `uchat_conversations`, `uchat_messages` | Tablas uchat NO en publicacion. Canales directos mantenidos intencionalmente |
| 2 | `LiveChatCanvas.tsx` | 3598 | Probable uchat | Canal adicional directo para uchat |

### Categoria C: Dead code confirmado

| # | Archivo | Linea | Notas |
|---|---------|-------|-------|
| 1 | `notificationListenerService.ts` | 35, 65 | Servicio completo sin uso activo (`NotificationListener` comentado en MainApp.tsx) |
| 2 | `NotificationListener.tsx` | 72, 115 | Componente comentado: `{/* <NotificationListener /> */}` en MainApp.tsx (3 instancias) |
| 3 | `LiveMonitorKanban.tsx` | 3298, 3480 | Dentro del useEffect comentado (`/* ... */`) de Fase 1 |

## Preguntas clave antes de deploy

### 1. liveMonitorKanbanOptimized.ts (linea 330) — es dead code?
- Tiene `subscribeToChanges()` con 4 `.on('postgres_changes')` a `llamadas_ventas`
- **DIFERENTE** de `liveMonitorOptimizedService.ts` (ese ya fue limpiado en Fase 2)
- Verificar si algun componente llama `liveMonitorKanbanOptimized.subscribeToChanges()`
- Si es dead code, eliminar

### 2. Servicios de notificaciones — cuantos hay activos?
- Hay 3+ servicios de notificaciones: `notificationsService.ts`, `notificationService.ts`, `userNotificationService.ts`, `notificationListenerService.ts`
- Posible duplicacion historica
- Verificar cuales estan activos y cuales son dead code

### 3. AuthContext.tsx (linea 212) — migrar?
- Canal `session_${userId}` escucha `auth_user_coordinaciones` y `system_config`
- Es multi-tabla en un solo canal
- Si se migra al hub, se necesitan 2 `realtimeHub.subscribe()` separados
- `system_config` ya tiene canal hub via `useVersionCheck.ts`, asi que este compartira

### 4. LlamadasProgramadasWidget.tsx — migrar?
- Canal con 3 `.on()` (INSERT, UPDATE, DELETE) a `llamadas_programadas`
- `llamadas_programadas` esta en publicacion Realtime
- LiveChatCanvas ya migro su suscripcion a `llamadas_programadas` via hub

### 5. Eliminar dead code completo?
- `notificationListenerService.ts` — servicio entero sin uso
- `NotificationListener.tsx` — componente comentado
- Dead code en `LiveMonitorKanban.tsx` — useEffect comentado

## Archivos modificados (total Fase 1 + Fase 2 + este cambio)

| Archivo | Accion | Estado |
|---------|--------|--------|
| `src/services/realtimeHub.ts` | CREADO | Listo |
| `src/hooks/useVersionCheck.ts` | Migrado al hub | Listo |
| `src/stores/liveActivityStore.ts` | Migrado | Listo |
| `src/stores/notificationStore.ts` | Checkpoint #5 removido | Listo |
| `src/components/Sidebar.tsx` | Sonido/animacion removidos | Listo |
| `src/components/analysis/LiveMonitor.tsx` | Migrado | Listo |
| `src/components/analysis/LiveMonitorKanban.tsx` | Dead code cleanup | Listo |
| `src/components/chat/LiveChatCanvas.tsx` | Migrado (3 hub subs) | Listo |
| `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` | Migrado | Listo |
| `src/components/dashboard/widgets/ConversacionesWidget.tsx` | Migrado parcial (hub + uchat directo) | Listo |
| `src/components/dashboard/widgets/LlamadasActivasWidget.tsx` | Migrado | Listo |
| `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` | Migrado + 3 brace fixes | Listo |
| `src/components/prospectos/ProspectosManager.tsx` | Migrado | Listo |
| `src/contexts/AuthContext.tsx` | Cleanup hub en logout | Listo |
| `src/services/liveMonitorOptimizedService.ts` | Dead code removido | Listo |
| `scripts/deploy-v2.ts` | Cambio pre-existente | N/A |

## Impacto estimado post-deploy

| Metrica | Antes | Despues (estimado) |
|---------|-------|---------------------|
| Tablas en publicacion | 20 | 13 (-35%) |
| Canales por usuario (tablas principales) | ~14+ | ~4 (hub) + ~10 directos |
| `list_changes` procesadas/min | ~800 | ~300 estimado (-62%) |
| CPU target | 93% | **<60%** |

**Nota**: Migrar las suscripciones restantes de Categoria A podria reducir los ~10 canales directos a ~4 canales hub adicionales, bajando CPU aun mas.

## Estrategia de rollback

### Rollback total (frontend + BD, ~5 min)
```bash
# 1. Frontend: revert cambios
git checkout -- . && ./update-frontend.sh

# 2. BD: restaurar publicacion
ALTER PUBLICATION supabase_realtime ADD TABLE
  z_backup_auth_sessions, z_legacy_auth_users_table_backup,
  coordinaciones, permission_groups, group_permissions,
  user_permission_groups, whatsapp_conversation_labels;
```

## Proximos pasos

1. **Auditar suscripciones Categoria A** — decidir cuales migrar al hub
2. **Limpiar dead code Categoria C** — eliminar servicios sin uso
3. **Deploy** — cuando se decida el alcance final
4. **Monitorear CPU** — target <50%, verificar Realtime metrics 24h post-deploy
