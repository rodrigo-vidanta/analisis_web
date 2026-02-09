# Fix: Sistema de Notificaciones Centro de Administración

**Fecha:** 2026-02-09
**Estado:** Implementado, pendiente deploy
**Build:** OK (tsc --noEmit limpio)
**Archivos modificados:** 4 (+ 1 pre-existente no relacionado)

## Problema Reportado

El usuario identificó 3 bugs críticos en el sistema de notificaciones del Centro de Administración:

1. **Notificaciones no se borran**: Al leer todos los tickets, si llega una nueva notificación, TODAS las conversaciones aparecen como nuevas otra vez
2. **Notificaciones duplicadas**: Los tickets asignados al admin aparecen tanto en "Centro de Mensaje" (Header Mail) como en "Centro de Soporte" (SupportButton lifebuoy). Centro de Soporte debería mostrar SOLO tickets que el usuario abrió como reportero
3. **Estado de lectura no persiste**: Abrir una conversación/ticket no marca como leído permanentemente

## Causa Raíz

### Bug 1 - Todas las conversaciones como nuevas
- `AdminMessagesModal.tsx` usaba `readTicketIds` (un `Set<string>` efímero en estado React) para rastrear qué tickets se leyeron
- Cada vez que el modal se abría, el Set se reiniciaba vacío (`setReadTicketIds(new Set())`)
- La lógica de badges usaba `ticket.status === 'abierto'` en vez del tracking real de BD (`support_ticket_views`)
- Resultado: al reabrir el modal, todos los tickets perdían su estado de lectura

### Bug 2 - Notificaciones duplicadas
- `Header.tsx` sumaba `unreadCount + ticketUnreadCount` en el badge del Mail, contando TODAS las notificaciones de tickets
- `SupportButton.tsx` también contaba TODAS las notificaciones de tickets (`getUnreadNotificationCount`)
- No se filtraba por `assignment_context` — un admin que es asignado a un ticket Y también lo reportó veía duplicados
- Los tickets asignados a un admin aparecían en SupportButton cuando solo deberían verse en AdminMessagesModal

### Bug 3 - Estado de lectura no persiste
- `handleSelectTicket` en AdminMessagesModal solo hacía `setReadTicketIds(prev => new Set(prev).add(ticket.id))` (estado local)
- NO llamaba a `markTicketAsViewed()` (RPC que escribe en `support_ticket_views`)
- NO recargaba la lista de tickets después de marcar como leído

## Solución Implementada

### 1. `src/services/ticketService.ts` (+42 líneas)
Agregados 2 métodos nuevos para filtrar por `assignment_context = 'reporter'`:

- **`getReporterUnreadNotificationCount(userId)`**: Cuenta notificaciones no leídas SOLO de tickets que el usuario reportó
- **`markAllReporterNotificationsAsRead(userId)`**: Marca como leídas SOLO notificaciones de reporter

### 2. `src/components/admin/AdminMessagesModal.tsx` (5 cambios)
- **Estado de tickets**: Tipo cambiado a `(SupportTicket & { hasNewBadge: boolean; hasMessageBadge: boolean; unreadCount: number })[]` para usar badges de BD
- **`loadTickets`**: Usa `getTicketsWithBadges(user.id)` en vez de `getAllTickets({})` — ahora trae info de `support_ticket_views`
- **`handleSelectTicket`**: Ahora llama `markTicketAsViewed()` + `markTicketNotificationsAsRead()` + recarga lista
- **Badges**: Usa `ticket.hasNewBadge` y `ticket.hasMessageBadge` de BD en vez de estado local
- **Eliminado**: `readTicketIds` state y su reset en useEffect
- **Tabs**: Orden cambiado — Tickets a la IZQUIERDA, Mensajes a la DERECHA
- **Default**: `activeSection` inicializa como `'tickets'` (antes era `'messages'`)

### 3. `src/components/Header.tsx` (-114 líneas netas)
- **Eliminado**: `ticketUnreadCount` state completo
- **Eliminado**: useEffect de ~80 líneas que cargaba/suscribía tickets (polling 30s + Realtime)
- **Mail badge**: Solo muestra `unreadCount` (mensajes admin: password reset, desbloqueo, etc.)
- **onClose**: Solo recarga mensajes admin, ya no recarga tickets
- **Eliminado**: imports de `ticketService` y `analysisSupabase`

### 4. `src/components/support/SupportButton.tsx` (3 cambios)
- **`loadNotificationCount`**: Usa `getReporterUnreadNotificationCount()` — solo cuenta tickets que el usuario reportó
- **Realtime subscription**: Recarga conteo real desde BD en vez de `prev + 1`
- **`handleMyTickets`**: Usa `markAllReporterNotificationsAsRead()` para limpiar solo notificaciones de reporter

## Flujo de Notificaciones Corregido

```
Ticket creado por usuario X:
  → Trigger BD crea notificaciones:
    - Para X (reporter): assignment_context = 'reporter'
    - Para admins asignados: assignment_context = 'specific_user' / 'role_group' / 'all_admins'

SupportButton (lifebuoy) → Solo muestra notificaciones donde assignment_context = 'reporter'
Header Mail → Solo muestra admin messages (password reset, desbloqueo, etc.)
AdminMessagesModal → Muestra TODOS los tickets con badges de BD (support_ticket_views)
```

## Tablas BD Involucradas

| Tabla | Rol |
|-------|-----|
| `support_tickets` | Tickets de soporte |
| `support_ticket_notifications` | Notificaciones con `assignment_context` |
| `support_ticket_views` | Registro persistente de lectura por usuario |
| `admin_messages` | Mensajes admin (BD SystemUI) |

## RPCs Usados

- `mark_ticket_viewed(p_ticket_id, p_user_id)` → UPSERT en `support_ticket_views`, marca notificaciones como leídas

## UI: Orden de Tabs en Centro de Administración

- **Antes**: [Mensajes] [Tickets] — default: Mensajes
- **Después**: [Tickets] [Mensajes] — default: Tickets

## Cambio No Relacionado

- `src/components/chat/media-selector/ImageGrid.tsx` — modificado en sesión anterior (infinite scroll), no relacionado con este fix

## Testing Manual Sugerido

1. Abrir Centro de Administración → debe abrir en tab Tickets (izquierda)
2. Abrir un ticket → debe marcarse como leído (badge desaparece)
3. Cerrar y reabrir modal → el ticket debe seguir marcado como leído
4. Recibir nueva notificación → SOLO ese ticket debe mostrar badge nuevo
5. Como admin asignado a un ticket: la notificación debe aparecer en Centro de Administración, NO en Centro de Soporte
6. Como reportero de un ticket: la notificación debe aparecer en Centro de Soporte (lifebuoy), NO duplicarse en Header Mail
7. Header Mail badge → solo debe contar mensajes admin (password reset, etc.)
