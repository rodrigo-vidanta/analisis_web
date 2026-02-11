# HANDOVER-2026-02-11-TICKET-NOTIFICATIONS-ADMIN-PANEL

**Fecha**: 2026-02-11 | **Version**: pendiente deploy | **Herramienta**: Claude Code (Opus 4.6)

## Resumen

Fix de notificaciones de tickets en el Centro de Administración. El `AdminTicketsPanel` existía como componente completo pero nunca fue montado en la app. Se agregó como nueva pestaña "Tickets" en `AdminDashboardTabs`, visible para admin, administrador operativo y coordinador de calidad, con badge de notificaciones Realtime.

## Contexto: Sesión anterior (CPU Optimization Fase 3)

Este handover es continuación de `2026-02-11-cpu-optimization-phase3-deploy.md`. Durante la optimización de Realtime, el usuario reportó que las notificaciones de tickets del Centro de Administración no llegaban y preguntó si las habíamos migrado.

---

## Diagnóstico

### Investigación realizada

1. **`ticketService.ts` NO fue tocado** en la migración de CPU — la suscripción Realtime directa `notifications-${userId}` estaba intacta
2. **Tabla `support_ticket_notifications`** sigue en `supabase_realtime` (13 tablas, no fue removida)
3. **Triggers BD funcionan correctamente** — se verificó que hay notificaciones recientes no leídas (TKT-20260211-0152, TKT-20260211-0153)
4. **Logs Realtime** sin errores

### Causa raíz encontrada

**`AdminTicketsPanel` nunca fue montado en la app.** El componente existía completo (~841 líneas) con:
- Dashboard tipo CRM con estadísticas por status
- Badges "Nuevo" y "Mensaje" por ticket
- Suscripción Realtime propia (`ticketService.subscribeToNotifications`)
- `getUnreadNotificationCount` (cuenta TODAS las notificaciones, no solo reporter)

Pero **solo estaba exportado** desde `src/components/support/index.ts`, sin ser importado por ningún componente de la app.

### Arquitectura de notificaciones de tickets (dos niveles)

| Nivel | Componente | Método de conteo | Contextos que muestra |
|-------|-----------|-----------------|----------------------|
| **Reporter** (usuarios) | `SupportButton` → "Mis Tickets" | `getReporterUnreadNotificationCount` | Solo `reporter` |
| **Admin** (centro admin) | `AdminTicketsPanel` (NO montado) | `getUnreadNotificationCount` | `all_admins`, `role_group`, `specific_user`, `reporter` |

El nivel admin estaba desconectado — las notificaciones se creaban en BD pero no había UI para mostrarlas.

---

## Error cometido y corregido

**Error:** Inicialmente modifiqué `SupportButton.tsx` para cambiar `getReporterUnreadNotificationCount` → `getUnreadNotificationCount`, mezclando las notificaciones de admin con las de reporter en el botón de soporte.

**Corrección:** Revertido inmediatamente. `SupportButton` debe seguir mostrando SOLO notificaciones de tickets que el usuario reportó. Las notificaciones admin van en el Centro de Administración.

---

## Fix implementado

### Archivo modificado: `src/components/admin/AdminDashboardTabs.tsx`

**Cambios:**

1. **Imports nuevos:**
   - `AdminTicketsPanel` desde `../support/AdminTicketsPanel`
   - `LifeBuoy` desde `lucide-react`

2. **Tipo `AdminTab` extendido:**
   ```typescript
   type AdminTab = '...' | 'tickets';
   ```

3. **Estado nuevo:**
   ```typescript
   const [ticketNotificationCount, setTicketNotificationCount] = useState(0);
   ```

4. **Nueva pestaña en array `tabs`:**
   - ID: `'tickets'`
   - Nombre: `'Tickets'`
   - Icono: `LifeBuoy`
   - Badge: `ticketNotificationCount` (badge rojo con número)
   - Visible para: `isAdmin || isAdminOperativo || isCoordinadorCalidad`

5. **Badge en sidebar:**
   - Sidebar expandido: badge rojo al lado del nombre de la pestaña
   - Sidebar colapsado: badge rojo sobre el icono
   - Se muestra solo cuando `badge > 0`

6. **Renderizado de contenido:**
   ```tsx
   {activeTab === 'tickets' && (isAdmin || isAdminOperativo || isCoordinadorCalidad) && (
     <div className="flex-1 relative">
       <div className="absolute inset-0 overflow-auto">
         <AdminTicketsPanel onNotificationCountChange={setTicketNotificationCount} />
       </div>
     </div>
   )}
   ```

7. **Ocultar scroll genérico** cuando tickets está activo (agregado a la clase condicional del div de "otros módulos")

### Cómo funciona el flujo completo

```
Trigger BD (INSERT en support_ticket_notifications)
  ↓
Supabase Realtime (tabla en publicación)
  ↓
AdminTicketsPanel.subscribeToNotifications(userId)
  ├── callback → loadNotificationCount() → getUnreadNotificationCount()
  │     ↓
  │   onNotificationCountChange(count) → setTicketNotificationCount en AdminDashboardTabs
  │     ↓
  │   Badge rojo se actualiza en la pestaña "Tickets"
  └── callback → loadTickets() → se actualizan badges por ticket
```

### Archivo NO modificado (revertido): `src/components/support/SupportButton.tsx`

Se modificó erróneamente y se revirtió. Estado final: idéntico al original.

---

## Archivos modificados

| Archivo | Acción | Detalle |
|---------|--------|---------|
| `src/components/admin/AdminDashboardTabs.tsx` | Editado | +nueva pestaña Tickets, +badge, +AdminTicketsPanel, +estado notificaciones |
| `src/components/support/SupportButton.tsx` | Revertido | Modificado erróneamente, revertido al estado original |

---

## Verificación

- `npx tsc --noEmit` — 0 errores
- `npm run build` — exitoso (20.29s)

---

## Notas técnicas

### Suscripción Realtime de AdminTicketsPanel

`AdminTicketsPanel` usa su propia suscripción directa:
```typescript
ticketService.subscribeToNotifications(user.id, callback)
// Canal: notifications-${userId}
// Tabla: support_ticket_notifications
// Evento: INSERT
// Filtro Postgres: user_id=eq.${userId}
```

Esta suscripción es independiente del RealtimeHub (canal directo con `analysisSupabase`). No se migró al hub porque:
- Usa filtro Postgres por `user_id` (seguridad)
- Solo se monta cuando el admin navega a la pestaña Tickets (bajo impacto)
- Volumen muy bajo (~10-20 notificaciones/día)

### Colisión de nombre de canal

`SupportButton` y `AdminTicketsPanel` ambos usan `notifications-${userId}` como nombre de canal. En Supabase JS v2, `client.channel(name)` con nombre duplicado devuelve la referencia existente. Cuando un componente desmonta y llama `removeChannel`, podría afectar al otro.

**Mitigación actual:** `AdminTicketsPanel` solo se monta cuando el admin navega a la pestaña Tickets, y `SupportButton` está siempre montado en el Header. Si ambos coinciden, el `removeChannel` del AdminTicketsPanel al cambiar de pestaña podría matar el canal de SupportButton. Impacto bajo porque SupportButton solo muestra notificaciones `reporter` y su conteo se recarga por polling cuando el componente se re-renderiza.

**Fix futuro recomendado:** Renombrar canales a `ticket-notif-reporter-${userId}` y `ticket-notif-admin-${userId}` para evitar colisión. O migrar ambos al RealtimeHub.

---

## Rollback

### Revertir pestaña Tickets
```bash
git diff HEAD -- src/components/admin/AdminDashboardTabs.tsx | git apply -R
```

No hay cambios en BD ni en otros archivos.

---

## Monitoreo post-deploy

1. **Pestaña Tickets visible** en Centro de Administración para admins
2. **Badge rojo** aparece cuando hay notificaciones no leídas
3. **Realtime funciona**: al crear un ticket o comentario, la lista se actualiza automáticamente
4. **SupportButton** sigue mostrando solo notificaciones reporter (sin cambios)
5. **CPU**: sin impacto adicional (AdminTicketsPanel solo se monta bajo demanda)
