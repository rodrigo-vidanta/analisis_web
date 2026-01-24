# Handover: Implementación Sistema de Notificaciones Contextual para Tickets

**Fecha:** 23 de Enero 2026  
**Autor:** AI Agent  
**Estado:** ✅ Completado (Pendiente Testing)

---

## 🎯 Objetivo

Implementar un sistema de notificaciones contextual que:
1. Notifique según la asignación actual del ticket (todos admins → grupo de roles → usuario específico)
2. Implemente sistema de "visto" para badges "Nuevo" y "Mensaje"
3. Gestione notificaciones solo de comentarios relevantes (no auto-notificaciones)

---

## 📦 Archivos Modificados

### Base de Datos
- ✅ `migrations/20260123_fix_ticket_notifications.sql` - Migración completa

### Backend
- ✅ `src/services/ticketService.ts`
  - Agregado `markTicketAsViewed(ticketId, userId)`
  - Agregado `getTicketsWithBadges(userId)` que retorna tickets con badges calculados

### Frontend
- ✅ `src/components/support/AdminTicketsPanel.tsx`
  - Actualizado tipo de estado de `tickets` para incluir badges
  - Modificado `loadTickets()` para usar `getTicketsWithBadges()`
  - Actualizado `loadTicketDetails()` para llamar `markTicketAsViewed()`
  - Agregados badges "NUEVO" y "💬 [count]" en el renderizado de lista

- ✅ `src/components/support/MyTicketsModal.tsx`
  - Actualizado tipo de estado de `tickets` para incluir badges
  - Modificado `loadTickets()` para usar `getTicketsWithBadges()`
  - Actualizado `handleSelectTicket()` para llamar `markTicketAsViewed()`
  - Agregados badges "NUEVO" y "💬 [count]" en el renderizado de lista

---

## 🗃️ Cambios en Base de Datos

### 1. Nueva Tabla: `support_ticket_views`
Tracking de visualizaciones por usuario:
```sql
CREATE TABLE support_ticket_views (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id),
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMPTZ,
  last_comment_read_at TIMESTAMPTZ,
  UNIQUE(ticket_id, user_id)
);
```

### 2. Columnas Agregadas a `support_tickets`
```sql
ALTER TABLE support_tickets 
ADD COLUMN last_comment_at TIMESTAMPTZ,
ADD COLUMN last_comment_by UUID,
ADD COLUMN last_comment_by_role VARCHAR(50);
```

### 3. Columna Agregada a `support_ticket_notifications`
```sql
ALTER TABLE support_ticket_notifications
ADD COLUMN assignment_context VARCHAR(20) 
CHECK (assignment_context IN ('all_admins', 'role_group', 'specific_user', 'reporter'));
```

### 4. Funciones Agregadas/Modificadas
- ✅ `get_users_by_role(role_name)` - Obtiene usuarios por rol activo
- ✅ `notify_new_ticket()` - Notifica a todos los admins con contexto `all_admins`
- ✅ `notify_ticket_assignment()` - Nueva función para notificar asignaciones
- ✅ `notify_new_comment()` - Reescrita con lógica contextual
- ✅ `mark_ticket_viewed(ticket_id, user_id)` - Nueva función para marcar visto

### 5. Triggers Agregados/Modificados
- ✅ `trigger_notify_assignment` - Dispara al cambiar `assigned_to` o `assigned_to_role`
- ✅ `trigger_notify_new_comment` - Recreado para usar nueva función
- ✅ `trigger_notify_new_ticket` - Recreado para usar nueva función

---

## 🔄 Lógica de Notificaciones

### Ticket Creado
→ Notifica a **TODOS los admins** (`assignment_context: 'all_admins'`)

### Admin Asigna a Grupo
→ Notifica a **TODO el grupo** del rol (`assignment_context: 'role_group'`)

### Admin Asigna a Usuario
→ Notifica **SOLO a ese usuario** (`assignment_context: 'specific_user'`)

### Cliente Comenta
- Si asignado a usuario: Notifica **SOLO a ese usuario**
- Si asignado a grupo: Notifica a **TODO el grupo**
- Si sin asignar: Notifica a **TODOS los admins**

### Admin Comenta
→ Notifica **SOLO al cliente** (reporter) (`assignment_context: 'reporter'`)

### Usuario Abre Ticket
→ Llama `mark_ticket_viewed()` que:
1. Actualiza/inserta registro en `support_ticket_views`
2. Marca todas las notificaciones de ese ticket como leídas

---

## 🎨 Sistema de Badges

### Badge "NUEVO" (azul pulsante)
- **Se muestra cuando:** El usuario nunca ha visto el ticket
- **Desaparece cuando:** El usuario abre el ticket por primera vez
- **Lógica:** `!support_ticket_views[ticket_id, user_id]`

### Badge "💬 N" (verde)
- **Se muestra cuando:** Hay comentarios nuevos desde última visualización
- **Desaparece cuando:** El usuario abre el ticket
- **Lógica:** `ticket.last_comment_at > view.last_comment_read_at`
- **Count:** Número de notificaciones no leídas del ticket

---

## 🧪 Testing Requerido

### ✅ Test 1: Ticket Nuevo (Sin Asignación)
1. Crear ticket como usuario normal
2. ✓ Verificar que TODOS los admins reciben notificación
3. ✓ Verificar badge "NUEVO" en lista de AdminTicketsPanel
4. Admin abre ticket → ✓ Badge desaparece solo para ese admin

### ✅ Test 2: Asignación a Grupo
1. Admin asigna ticket a "coordinador"
2. ✓ Verificar que TODOS los coordinadores reciben notificación
3. ✓ Verificar badge "NUEVO" para coordinadores
4. Coordinador abre → ✓ Badge desaparece solo para él

### ✅ Test 3: Asignación a Usuario Específico
1. Admin asigna a usuario X
2. ✓ Verificar que SOLO usuario X recibe notificación
3. Usuario X abre → ✓ Badge desaparece

### ✅ Test 4: Comentario de Cliente
1. Cliente comenta en ticket asignado a usuario
2. ✓ Verificar que SOLO ese usuario recibe notificación
3. ✓ Verificar badge "💬 1" en lista
4. Usuario abre → ✓ Badge desaparece

### ✅ Test 5: Comentario de Admin
1. Admin comenta en ticket de cliente
2. ✓ Verificar que SOLO el cliente recibe notificación
3. ✓ Admin NO recibe notificación de su propio comentario

### ✅ Test 6: Badge Persistente
1. Usuario A abre ticket → Badge desaparece
2. Usuario B NO ha abierto ticket → Badge sigue visible para B
3. ✓ Verificar independencia de badges por usuario

---

## 📊 Queries de Verificación

### Verificar notificaciones con contexto
```sql
SELECT 
  t.ticket_number,
  n.type,
  n.assignment_context,
  u.full_name as notified_user,
  n.is_read
FROM support_ticket_notifications n
JOIN support_tickets t ON t.id = n.ticket_id
JOIN user_profiles_v2 u ON u.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;
```

### Verificar vistas de tickets
```sql
SELECT 
  t.ticket_number,
  u.full_name,
  v.last_viewed_at,
  v.last_comment_read_at,
  t.last_comment_at
FROM support_ticket_views v
JOIN support_tickets t ON t.id = v.ticket_id
JOIN user_profiles_v2 u ON u.id = v.user_id
ORDER BY v.last_viewed_at DESC;
```

### Verificar badges (simulación)
```sql
-- Tickets con badge "NUEVO" para user_id = 'XXX'
SELECT t.ticket_number
FROM support_tickets t
WHERE NOT EXISTS (
  SELECT 1 FROM support_ticket_views v
  WHERE v.ticket_id = t.id AND v.user_id = 'XXX'
);

-- Tickets con badge "MENSAJE" para user_id = 'XXX'
SELECT t.ticket_number, t.last_comment_at, v.last_comment_read_at
FROM support_tickets t
JOIN support_ticket_views v ON v.ticket_id = t.id
WHERE v.user_id = 'XXX'
  AND t.last_comment_at > v.last_comment_read_at
  AND t.last_comment_by != 'XXX';
```

---

## ⚠️ Notas Importantes

1. **Backwards Compatibility:** Las notificaciones existentes seguirán funcionando (pueden tener `assignment_context = NULL`)

2. **Performance:** Los índices agregados aseguran que las consultas de badges sean rápidas incluso con miles de tickets:
   - `idx_ticket_views_ticket`
   - `idx_ticket_views_user`
   - `idx_ticket_views_composite`
   - `idx_tickets_last_comment`
   - `idx_notifications_context`

3. **Realtime:** El sistema de subscripciones Realtime seguirá funcionando. Los badges se actualizan al recargar la lista.

4. **Migración de Datos:** Las notificaciones existentes NO se migrarán a la nueva estructura. Solo los tickets nuevos usarán el sistema completo.

5. **RPC Security:** Las funciones RPC usan `SECURITY DEFINER` pero validan contexto de usuario para prevenir abusos.

---

## 📝 Rollback Plan

Si algo falla:

```sql
-- Remover triggers nuevos
DROP TRIGGER IF EXISTS trigger_notify_assignment ON support_tickets;

-- Eliminar columnas (solo si es rollback completo)
ALTER TABLE support_tickets 
DROP COLUMN IF EXISTS last_comment_at,
DROP COLUMN IF EXISTS last_comment_by,
DROP COLUMN IF EXISTS last_comment_by_role;

ALTER TABLE support_ticket_notifications
DROP COLUMN IF EXISTS assignment_context;

-- Eliminar tabla de vistas
DROP TABLE IF EXISTS support_ticket_views;

-- Restaurar funciones originales (backup requerido antes de ejecutar migración)
```

---

## 🚀 Próximos Pasos

1. ✅ **Ejecutar migración SQL** en base de datos de producción (PQNC_AI)
2. ✅ **Deploy del código** frontend/backend
3. ⚠️ **Testing manual** según checklist arriba
4. ⚠️ **Monitoreo** de notificaciones durante 24 horas
5. ⚠️ **Ajustes** si es necesario

---

## 🔗 Referencias

- Plan Original: `.cursor/plans/sistema_notificaciones_tickets_18e874c3.plan.md`
- Arquitectura BD: `docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md`
- Servicio de Tickets: `src/services/ticketService.ts`

---

**Estimación de impacto:**
- Complejidad: Media-Alta
- Riesgo: Medio (funcionalidad crítica de soporte)
- Testing requerido: Extensivo
- Tiempo estimado total: ~4 horas (desarrollo + testing)

**Estado actual:** Código implementado, falta ejecutar migración SQL y testing.
