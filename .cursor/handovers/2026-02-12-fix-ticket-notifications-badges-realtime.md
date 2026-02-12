# HANDOVER-2026-02-12-FIX-TICKET-NOTIFICATIONS-BADGES-REALTIME

**Fecha**: 2026-02-12 | **Version**: pendiente deploy | **Herramienta**: Claude Code (Opus 4.6)

## Resumen

Fix completo del sistema de notificaciones y badges de tickets. Se corrigieron 5 bugs interrelacionados: colisión de canales Realtime, badge en componente equivocado, badges "NUEVO" persistentes en tickets ya leídos, comparación de fechas con NULL, y falta de suscripción independiente en el admin dashboard.

## Contexto

Continuación directa de `2026-02-11-ticket-notifications-admin-panel.md`. El usuario reportó que:
1. Las notificaciones de tickets no llegaban en tiempo real al admin
2. El count no se actualizaba cuando un usuario respondía
3. Tickets viejos ya leídos/respondidos seguían mostrando badge "NUEVO"
4. El badge se agregó al salvavidas (SupportButton) cuando debía estar en el sobre (Mail icon)

---

## Bugs encontrados y corregidos

### BUG 1: Colisión de canales Realtime

**Problema**: `SupportButton` y `AdminTicketsPanel` ambos usaban `notifications-${userId}` como nombre de canal. En Supabase JS v2, `client.channel(name)` con nombre duplicado devuelve la referencia existente. Cuando un componente desmontaba y llamaba `removeChannel`, mataba el canal del otro.

**Fix**: Canales separados con sufijos únicos:
- `ticket-notif-reporter-${userId}` → SupportButton
- `ticket-notif-admin-tabs-${userId}` → AdminDashboardTabs
- `ticket-notif-admin-panel-${userId}` → AdminTicketsPanel
- `ticket-notif-admin-header-${userId}` → Header

**Archivos**: `ticketService.ts` (nuevos métodos `subscribeToReporterNotifications`, `subscribeToAdminNotifications` con `channelSuffix`)

### BUG 2: Badge en componente equivocado

**Problema**: Se agregó el badge de notificaciones admin al SupportButton (salvavidas). El usuario aclaró que:
- **SupportButton (salvavidas)** = para USUARIOS crear/ver sus propios tickets
- **Mail icon (sobre)** = para ADMINS ver tickets reportados (Centro de Administración)

**Fix**:
- `SupportButton.tsx`: Revertido a solo `getReporterUnreadNotificationCount` (tickets propios)
- `Header.tsx`: Badge combinado en el Mail icon (`totalMailBadgeCount = unreadCount + ticketNotificationCount`)
- Mail icon ahora visible para `isAdmin || isAdminOperativo || isCoordinadorCalidad`

### BUG 3: AdminDashboardTabs sin suscripción independiente

**Problema**: `AdminTicketsPanel` solo se monta cuando el usuario navega a la pestaña Tickets. Antes de eso, no hay componente que cargue el conteo de notificaciones.

**Fix**:
- `AdminDashboardTabs`: useEffect independiente que carga `ticketNotificationCount` y suscribe a Realtime (canal `tabs`)
- `Header.tsx`: useEffect independiente que carga `ticketNotificationCount` y suscribe a Realtime (canal `header`)
- Ambos se montan al cargar la app, sin depender de que el admin navegue a tickets

### BUG 4: Badges "NUEVO" persistentes en tickets ya leídos

**Problema**: ~20 tickets donde Samuel ya había comentado/respondido no tenían entry en `support_ticket_views`. La lógica `hasNewBadge = !userView` los marcaba como "NUEVO" porque `AdminTicketsPanel` no estaba montado antes (nunca se llamó `markTicketAsViewed`).

**Fix**:
- Migración SQL `backfill_ticket_views_for_admins`: Creó entries en `support_ticket_views` para todos los tickets donde admins habían comentado pero no tenían view
- Resultado: 0 tickets sin view donde Samuel comentó (antes ~20)

### BUG 5: Badge "Mensaje" persistente por comparación con NULL

**Problema**: Cuando `last_comment_read_at` era NULL (ticket sin comentarios al momento de ser visto), la comparación en `getTicketsWithBadges`:
```typescript
new Date(ticket.last_comment_at) > new Date(userView.last_comment_read_at || 0)
```
Convertía `null || 0` a `new Date(0)` = 1 Enero 1970. Cualquier fecha posterior era mayor, haciendo el badge permanente.

**Fix dual**:
- Frontend (`ticketService.ts`): Fallback a `last_viewed_at` cuando `last_comment_read_at` es null:
  ```typescript
  new Date(userView.last_comment_read_at || userView.last_viewed_at)
  ```
- SQL (`mark_ticket_viewed`): `COALESCE(ticket_last_comment, NOW())` en lugar de valor NULL
- Migración: Corrigió todos los `last_comment_read_at = NULL` existentes

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `src/services/ticketService.ts` | +`subscribeToReporterNotifications`, +`subscribeToAdminNotifications(channelSuffix)`, fix comparación badges NULL |
| `src/components/Header.tsx` | +import ticketService, +ticketNotificationCount state, +Realtime subscription, badge combinado en Mail icon, Mail visible para coordinadorCalidad |
| `src/components/admin/AdminDashboardTabs.tsx` | +ticketNotificationCount independiente, +Realtime subscription canal 'tabs' |
| `src/components/support/AdminTicketsPanel.tsx` | Canal 'panel', +selectedTicketRef, +auto-refresh comentarios, +await loadTickets |
| `src/components/support/SupportButton.tsx` | Revertido a reporter-only, canal 'reporter' |

## Migraciones BD aplicadas

| Migración | Descripción |
|-----------|-------------|
| `fix_mark_ticket_viewed_null_comment` | `COALESCE(ticket_last_comment, NOW())` para evitar NULL en last_comment_read_at |
| `backfill_ticket_views_for_admins` | Crear views para tickets comentados por admins + corregir NULLs existentes |

---

## Arquitectura final de notificaciones de tickets

```
                          ┌──────────────────────────────────┐
                          │   Trigger BD (INSERT notificación) │
                          └──────────────┬───────────────────┘
                                         │ Supabase Realtime
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │ Header.tsx       │  │ AdminDashboard   │  │ AdminTickets    │
          │ canal: header    │  │ canal: tabs      │  │ canal: panel    │
          │ Badge en Mail ✉️ │  │ Badge en tab 🎫  │  │ Lista + badges  │
          │ (siempre visible)│  │ (admin mode)     │  │ (pestaña activa)│
          └─────────────────┘  └─────────────────┘  └─────────────────┘
                    │
          ┌─────────────────┐
          │ SupportButton    │
          │ canal: reporter  │
          │ Badge salvavidas │
          │ (solo MIS tickets)│
          └─────────────────┘
```

### Canales Realtime activos (por usuario admin)

| Canal | Componente | Montaje | Propósito |
|-------|-----------|---------|-----------|
| `ticket-notif-reporter-{uid}` | SupportButton | Siempre | Notif de tickets que el usuario creó |
| `ticket-notif-admin-header-{uid}` | Header | Siempre (admin) | Badge combinado en sobre |
| `ticket-notif-admin-tabs-{uid}` | AdminDashboardTabs | Admin mode | Badge en pestaña Tickets |
| `ticket-notif-admin-panel-{uid}` | AdminTicketsPanel | Pestaña Tickets activa | Refresh lista + comentarios |

### Lógica de badges en AdminTicketsPanel

```typescript
// "NUEVO": No existe registro en support_ticket_views para este admin
hasNewBadge = !userView;

// "MENSAJE": Comentario nuevo desde última lectura
// Fallback: usa last_viewed_at si last_comment_read_at es null
hasMessageBadge = userView && last_comment_at &&
                  last_comment_by !== userId &&
                  last_comment_at > (last_comment_read_at || last_viewed_at);
```

---

## Verificación

- `npx tsc --noEmit` — 0 errores
- `npm run build` — exitoso (22.61s)
- BD: 0 views con NULL, 0 falsos positivos de badges

---

## Datos de verificación post-fix

| Métrica | Antes | Después |
|---------|-------|---------|
| Tickets con badge "NUEVO" falso (Samuel) | ~20 | 0 |
| Views con `last_comment_read_at = NULL` | 8+ | 0 |
| Tickets legítimamente nuevos (sin view ni interacción) | - | 9 |

---

## Monitoreo post-deploy

1. **Badge en Mail icon**: Aparece con conteo combinado (mensajes admin + tickets) para admin/adminOperativo/coordinadorCalidad
2. **Realtime funciona**: Al crear ticket o comentar, badge se actualiza en Header sin navegar a admin
3. **Badges "NUEVO"**: Solo aparecen en tickets que el admin nunca abrió
4. **Badges "Mensaje"**: Se limpian correctamente después de abrir el ticket
5. **SupportButton**: Solo muestra notificaciones de tickets propios del usuario (reporter)
6. **Sin colisión de canales**: 4 canales independientes con sufijos únicos

---

## Rollback

### Frontend
```bash
git diff HEAD -- src/components/Header.tsx src/components/admin/AdminDashboardTabs.tsx src/components/support/AdminTicketsPanel.tsx src/components/support/SupportButton.tsx src/services/ticketService.ts | git apply -R
```

### BD (revertir función mark_ticket_viewed)
```sql
-- Revertir a versión sin COALESCE
CREATE OR REPLACE FUNCTION mark_ticket_viewed(ticket_id_param UUID, user_id_param UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ticket_last_comment TIMESTAMPTZ;
BEGIN
  SELECT last_comment_at INTO ticket_last_comment FROM support_tickets WHERE id = ticket_id_param;
  INSERT INTO support_ticket_views (ticket_id, user_id, last_viewed_at, last_comment_read_at)
  VALUES (ticket_id_param, user_id_param, NOW(), ticket_last_comment)
  ON CONFLICT (ticket_id, user_id) DO UPDATE SET
    last_viewed_at = NOW(), last_comment_read_at = ticket_last_comment;
  UPDATE support_ticket_notifications SET is_read = true
  WHERE ticket_id = ticket_id_param AND user_id = user_id_param AND is_read = false;
END; $$;
```

Nota: El backfill de views NO necesita rollback (datos correctos agregados).
