# Handover: Sistema de Notificaciones Contextual de Tickets

**Fecha:** 23 de Enero 2026  
**Agente:** Claude Sonnet 4.5  
**Duración:** ~1 hora  
**Estado:** ✅ Implementado - En testing

---

## 📋 Resumen Ejecutivo

Se implementó **completamente** el nuevo sistema de notificaciones contextual de tickets de soporte, que soluciona los problemas de contadores incorrectos y badges mal aplicados.

**Problemas corregidos:**
1. ✅ Notificaciones incorrectas en centro de soporte para admins
2. ✅ Badges "NUEVO" aparecían en tickets viejos
3. ✅ Auto-notificaciones (admin recibía notificaciones de sus propios comentarios)
4. ✅ No había sistema de "visto" para badges

**Nueva funcionalidad:**
- ✅ Notificaciones contextuales según asignación
- ✅ Sistema de badges "Nuevo" y "Mensaje"
- ✅ Tracking de visualizaciones por usuario
- ✅ Auto-cambio a "en_progreso" cuando admin responde

---

## 🎯 Cambios Implementados

### 1. Base de Datos (✅ Completado)

#### Nueva Tabla: `support_ticket_views`
```sql
CREATE TABLE support_ticket_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_comment_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);
```

**Propósito:** Tracking de cuándo cada usuario vio un ticket por última vez.

#### Columnas Agregadas a `support_tickets`
```sql
ALTER TABLE support_tickets ADD COLUMN:
- last_comment_at TIMESTAMPTZ
- last_comment_by UUID
- last_comment_by_role VARCHAR(50)
```

**Propósito:** Metadata del último comentario para calcular badges.

#### Columna Agregada a `support_ticket_notifications`
```sql
ALTER TABLE support_ticket_notifications ADD COLUMN:
- assignment_context VARCHAR(20) CHECK (IN ('all_admins', 'role_group', 'specific_user', 'reporter'))
```

**Propósito:** Identificar el contexto de la notificación (todos los admins, grupo, usuario específico, o reporter).

### 2. Funciones PostgreSQL (✅ Completado)

#### `get_users_by_role(role_name TEXT)`
Obtiene lista de usuarios activos por rol.

#### `notify_new_ticket()`
Notifica a **TODOS los administradores** cuando se crea un ticket nuevo.

**Lógica:**
- `assignment_context = 'all_admins'`
- Notificación: "Nuevo ticket: TKT-XXX - Título"

#### `notify_ticket_assignment()`
Notifica cuando un ticket es **asignado** a grupo o usuario.

**Lógica:**
- Si `assigned_to` no es NULL → notificar solo a ese usuario (`assignment_context = 'specific_user'`)
- Si `assigned_to_role` no es NULL → notificar a todos los usuarios de ese rol (`assignment_context = 'role_group'`)

#### `notify_new_comment()`
Lógica **contextual** de notificaciones según quién comenta.

**Flujo:**

```
SI admin comenta (y NO es interno):
  → Notificar al reporter (`assignment_context = 'reporter'`)

SI cliente comenta:
  SI ticket está asignado a usuario específico:
    → Notificar solo a ese usuario (`assignment_context = 'specific_user'`)
  SI ticket está asignado a grupo de roles:
    → Notificar a todos del grupo (`assignment_context = 'role_group'`)
  SI ticket NO está asignado:
    → Notificar a todos los admins (`assignment_context = 'all_admins'`)
```

**IMPORTANTE:** Actualiza `last_comment_at`, `last_comment_by`, `last_comment_by_role` en `support_tickets`.

#### `mark_ticket_viewed(ticket_id UUID, user_id UUID)`
Marca ticket como visto y las notificaciones como leídas.

**Lógica:**
```sql
1. INSERT/UPDATE en support_ticket_views
   - last_viewed_at = NOW()
   - last_comment_read_at = (último comentario del ticket)
   
2. UPDATE support_ticket_notifications
   - SET is_read = true
   - WHERE ticket_id = X AND user_id = Y
```

### 3. Triggers (✅ Completado)

#### `trigger_notify_assignment`
```sql
CREATE TRIGGER trigger_notify_assignment
AFTER UPDATE ON support_tickets
FOR EACH ROW
WHEN (
  OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR 
  OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role
)
EXECUTE FUNCTION notify_ticket_assignment();
```

#### `trigger_notify_new_comment`
```sql
CREATE TRIGGER trigger_notify_new_comment
AFTER INSERT ON support_ticket_comments
FOR EACH ROW
EXECUTE FUNCTION notify_new_comment();
```

#### `trigger_notify_new_ticket`
```sql
CREATE TRIGGER trigger_notify_new_ticket
AFTER INSERT ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION notify_new_ticket();
```

### 4. Backend - `ticketService.ts` (✅ Ya existía)

El servicio ya tenía los métodos necesarios implementados:

#### `markTicketAsViewed(ticketId: string, userId: string)`
Llama a la función RPC `mark_ticket_viewed`.

#### `getTicketsWithBadges(userId: string)`
Obtiene tickets con información de badges calculados:

```typescript
{
  ...ticket,
  hasNewBadge: boolean,      // Ticket nunca visto por este usuario
  hasMessageBadge: boolean,  // Hay comentarios nuevos desde última vista
  unreadCount: number        // Conteo de notificaciones no leídas
}
```

**Lógica de badges:**
```typescript
// Badge "Nuevo": Usuario nunca lo ha visto
hasNewBadge = !userView

// Badge "Mensaje": Hay comentarios nuevos
hasMessageBadge = userView && 
                  ticket.last_comment_at && 
                  ticket.last_comment_by !== userId &&
                  new Date(ticket.last_comment_at) > new Date(userView.last_comment_read_at)
```

### 5. Frontend - Actualizado

#### `Header.tsx` (✅ Modificado)
```typescript
// ANTES (incorrecto):
const { count } = await analysisSupabase
  .from('support_tickets')
  .select('id', { count: 'exact', head: true })
  .in('status', ['new', 'open']); // ❌ Status incorrectos

// AHORA (correcto):
const { count } = await ticketService.getUnreadNotificationCount(user.id); // ✅ Solo notificaciones
setTicketUnreadCount(count || 0);
```

#### `AdminTicketsPanel.tsx` (✅ Modificado)

**Cambios:**
1. Usa `getTicketsWithBadges(userId)` en lugar de `getAllTickets()`
2. Al abrir ticket: llama `markTicketAsViewed()`
3. **Auto-cambio a "en_progreso":**

```typescript
const handleSubmitComment = async () => {
  // ... código de comentario ...
  
  // ✅ NUEVO: Auto-cambio si está "abierto" y admin comenta (no interno)
  if (!isInternalComment && selectedTicket.status === 'abierto') {
    await ticketService.updateTicketStatus(
      selectedTicket.id, 
      'en_progreso', 
      user.id, 
      user.full_name || user.email, 
      'Auto-cambio al enviar respuesta'
    );
    setSelectedTicket({ ...selectedTicket, status: 'en_progreso' });
    toast.success('Ticket movido a En Progreso', { icon: '🔄' });
  }
  
  loadTickets();
}
```

#### `MyTicketsModal.tsx` (✅ Ya estaba implementado)

Ya tenía la funcionalidad de badges y tracking de vistas:

```typescript
const handleSelectTicket = async (ticket: SupportTicket) => {
  setSelectedTicket(ticket);
  await loadComments(ticket.id);
  
  // ✅ Marcar como visto
  if (user?.id) {
    await ticketService.markTicketAsViewed(ticket.id, user.id);
    await loadTickets(); // Recargar para actualizar badges
  }
  
  if (onTicketRead) onTicketRead(ticket.id);
};
```

---

## 🔄 Lógica de Notificaciones (Resumen)

### Escenario 1: Ticket Nuevo
```
Usuario crea ticket
↓
Trigger: notify_new_ticket()
↓
Notificación a: TODOS los admins
Context: 'all_admins'
Badge: "NUEVO" para todos los admins hasta que lo abran
```

### Escenario 2: Asignación a Grupo
```
Admin asigna ticket a "administrador_operativo"
↓
Trigger: notify_ticket_assignment()
↓
Notificación a: Todos los usuarios con rol "administrador_operativo"
Context: 'role_group'
Badge: "NUEVO" para el grupo asignado
```

### Escenario 3: Asignación a Usuario
```
Admin asigna ticket a "Juan Pérez"
↓
Trigger: notify_ticket_assignment()
↓
Notificación a: Solo "Juan Pérez"
Context: 'specific_user'
Badge: "NUEVO" para Juan Pérez
```

### Escenario 4: Cliente Comenta
```
Cliente responde en ticket asignado a Juan
↓
Trigger: notify_new_comment()
↓
Notificación a: Solo Juan
Context: 'specific_user'
Badge: "MENSAJE" para Juan (si ya lo había visto antes)
```

### Escenario 5: Admin Comenta
```
Admin responde (comentario NO interno)
↓
Trigger: notify_new_comment()
↓
Notificación a: Reporter del ticket
Context: 'reporter'
Badge: "MENSAJE" para el reporter

+ Auto-cambio:
  Si status = 'abierto' → cambiar a 'en_progreso'
```

---

## 📊 Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `migrations/20260123_fix_ticket_notifications.sql` | 388 | ✅ Nueva migración completa |
| `src/components/Header.tsx` | 2 lugares | ✅ Usar `getUnreadNotificationCount()` |
| `src/components/support/AdminTicketsPanel.tsx` | ~240 | ✅ Auto-cambio + badges + tracking |
| `src/services/ticketService.ts` | N/A | ✅ Ya tenía métodos necesarios |
| `src/components/support/MyTicketsModal.tsx` | N/A | ✅ Ya tenía tracking implementado |

---

## ⚠️ Testing Manual Requerido

El usuario debe probar los siguientes escenarios:

### ✅ Checklist de Testing

#### 1. Ticket Nuevo
- [ ] Usuario crea ticket → Verificar que TODOS los admins reciben notificación
- [ ] Admin abre ticket → Badge "NUEVO" desaparece
- [ ] Otros admins aún ven badge "NUEVO"

#### 2. Asignación a Grupo
- [ ] Admin asigna ticket a rol "coordinador"
- [ ] Verificar que solo coordinadores reciben notificación
- [ ] Admin original NO recibe notificación
- [ ] Badge "NUEVO" aparece para coordinadores

#### 3. Asignación a Usuario
- [ ] Admin asigna ticket a usuario específico
- [ ] Solo ese usuario recibe notificación
- [ ] Badge "NUEVO" aparece para el usuario asignado

#### 4. Cliente Comenta
- [ ] Cliente agrega comentario en ticket asignado
- [ ] Solo asignado/grupo recibe notificación
- [ ] Reporter NO recibe notificación de su propio comentario

#### 5. Admin Comenta
- [ ] Admin responde (comentario NO interno)
- [ ] Ticket pasa automáticamente a "en_progreso"
- [ ] Reporter recibe notificación
- [ ] Badge "MENSAJE" aparece para el reporter
- [ ] Admin NO recibe notificación de su propio comentario

---

## 🐛 Bugs Corregidos (Histórico)

### Bug #1: Contadores Incorrectos en Header
**Causa:** Código intentaba filtrar tickets por `['new', 'open']` (inglés) cuando la BD usa `['abierto', 'en_progreso']` (español).

**Fix:** Cambiar a usar `ticketService.getUnreadNotificationCount(userId)`.

### Bug #2: Double-Counting en Notificaciones
**Causa:** Header sumaba tickets abiertos + notificaciones, duplicando el conteo.

**Fix:** Usar solo conteo de notificaciones.

### Bug #3: Auto-Notificaciones
**Causa:** Función `notify_new_comment()` no verificaba si el comentarista era el admin asignado.

**Fix:** Agregar verificación `IF admin_id != NEW.user_id THEN`.

### Bug #4: Badges "NUEVO" en Tickets Viejos
**Causa:** No existía sistema de tracking de visualizaciones.

**Fix:** Crear tabla `support_ticket_views` y función `mark_ticket_viewed()`.

---

## 🔐 Seguridad

- ✅ Todas las funciones usan `SECURITY DEFINER` (acceso controlado)
- ✅ RLS **HABILITADO** en todas las tablas de tickets
- ✅ Solo usuarios autenticados pueden acceder
- ✅ Validación de `assignment_context` a nivel de CHECK constraint
- ✅ Índices optimizados para performance

---

## 📚 Referencias

- **Plan Completo:** `.cursor/plans/sistema_notificaciones_tickets_18e874c3.plan.md`
- **Migración SQL:** `migrations/20260123_fix_ticket_notifications.sql`
- **Servicio Backend:** `src/services/ticketService.ts`
- **Panel Admin:** `src/components/support/AdminTicketsPanel.tsx`
- **Modal Usuario:** `src/components/support/MyTicketsModal.tsx`
- **Reglas del Sistema:** `.cursor/rules/tickets-system.mdc`

---

## 🚀 Próximos Pasos

1. **Testing Manual (EN PROGRESO):**
   - Usuario debe validar los 5 escenarios principales
   - Reportar cualquier comportamiento inesperado

2. **Monitoreo:**
   - Verificar performance de las funciones SQL
   - Revisar logs de errores en notificaciones

3. **Posibles Mejoras Futuras:**
   - Notificaciones por email (opcional)
   - Configuración de preferencias de notificaciones
   - Bulk actions (asignar múltiples tickets a la vez)
   - Métricas de tiempo de respuesta

---

## ✅ Validación Final

- [x] Migración SQL ejecutada sin errores
- [x] Todas las funciones PL/pgSQL creadas
- [x] Triggers activos
- [x] Backend actualizado
- [x] Frontend actualizado
- [x] TODOs completados
- [ ] Testing manual por usuario (EN PROGRESO)

**Estado:** ✅ **LISTO PARA TESTING**

---

**Última actualización:** 2026-01-23 21:30 UTC  
**Tiempo de implementación:** 1 hora  
**Próxima acción:** Validación manual por el usuario
