# Corrección del Sistema de Notificaciones de Tickets

**Fecha:** 30 de Enero 2026  
**Estado:** ✅ COMPLETADO  
**Base de Datos:** PQNC_AI (glsmifhkoaifvaegsozd)

---

## Resumen

Se aplicaron correcciones al sistema de notificaciones de tickets basadas en el diagnóstico de 3 agentes LLM diferentes. Se identificaron y corrigieron **8 problemas críticos** y **4 problemas adicionales**.

---

## Correcciones Aplicadas

### 1. ✅ Función Helper `is_support_admin()`

**Problema:** Inconsistencia entre `get_support_admin_ids()` (usa `role_id`) y `notify_new_comment()` (usaba `role_name`).

**Solución:** Nueva función que centraliza la verificación de admin usando `role_id` para consistencia.

```sql
CREATE OR REPLACE FUNCTION is_support_admin(user_id_param UUID)
RETURNS BOOLEAN
-- Usa role_id de auth_users para consistencia con get_support_admin_ids()
```

---

### 2. ✅ `notify_new_ticket()` Respeta Asignación Previa

**Problema:** Notificaba a TODOS los admins incluso si el ticket ya tenía asignación.

**Solución:** 
- Si `assigned_to` está definido → solo notifica al usuario asignado
- Si `assigned_to_role` está definido → solo notifica al grupo
- Si no hay asignación → notifica a todos los admins

---

### 3. ✅ `notify_new_comment()` con Lógica Consistente

**Problema:** 
- Usaba `user_profiles_v2.role_name` (strings) en vez de `role_id`
- No notificaba al admin asignado cuando otro admin comentaba

**Solución:**
- Usa `is_support_admin()` para verificación
- Cuando un admin comenta, también notifica al admin asignado (si es diferente)
- Cuando un cliente comenta en ticket sin asignar, solo notifica a admins involucrados

---

### 4. ✅ `notify_ticket_assignment()` con Deduplicación

**Problema:** 
- Creaba notificaciones duplicadas
- No limpiaba notificaciones al reasignar

**Solución:**
- Verifica si ya existe notificación no leída antes de insertar
- Marca como leídas las notificaciones `all_admins` y `role_group` de otros usuarios al reasignar

---

### 5. ✅ RLS en `support_ticket_views`

**Problema:** Tabla sin Row Level Security habilitado.

**Solución:**
```sql
ALTER TABLE support_ticket_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own views" 
  ON support_ticket_views FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access views"
  ON support_ticket_views FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

### 6. ✅ `notify_status_change()` Solo Estados Finales

**Problema:** Notificaba todos los cambios de estado, creando ruido.

**Solución:** Solo notifica cuando el estado cambia a:
- `resuelto`
- `cerrado`
- `cancelado`

---

### 7. ✅ Índices para Performance

Se agregaron índices compuestos:
```sql
CREATE INDEX idx_notifications_user_ticket_read 
  ON support_ticket_notifications(user_id, ticket_id, is_read);

CREATE INDEX idx_notifications_type_context 
  ON support_ticket_notifications(type, assignment_context, is_read);
```

---

### 8. ✅ Limpieza de Notificaciones Antiguas

**Acción:** Se marcaron como leídas 201 notificaciones de tickets cerrados con más de 7 días de antigüedad.

**Antes:** 587 notificaciones no leídas  
**Después:** 386 notificaciones no leídas  
**Reducción:** 34%

---

## Funciones Modificadas

| Función | Acción |
|---------|--------|
| `is_support_admin(UUID)` | **NUEVA** - Helper para verificar admin |
| `notify_new_ticket()` | Respeta asignación previa |
| `notify_new_comment()` | Lógica consistente + notifica admin asignado |
| `notify_ticket_assignment()` | Deduplicación + limpieza |
| `notify_status_change()` | Solo estados finales |
| `cleanup_old_notifications()` | **NUEVA** - Limpieza de notificaciones antiguas |

---

## Triggers Recreados

| Trigger | Tabla | Evento |
|---------|-------|--------|
| `trigger_notify_new_ticket` | `support_tickets` | AFTER INSERT |
| `trigger_notify_new_comment` | `support_ticket_comments` | AFTER INSERT |
| `trigger_notify_assignment` | `support_tickets` | AFTER UPDATE (assigned_to/role) |
| `trigger_notify_status_change` | `support_tickets` | AFTER UPDATE (status) |

---

## Archivos Relacionados

- **Migración SQL:** `migrations/20260130_fix_notifications_system_complete.sql`
- **Servicio Frontend:** `src/services/ticketService.ts`
- **Handovers de diagnóstico:**
  - `.cursor/handovers/2026-01-30-diagnostico-notificaciones-tickets.md`
  - `.cursor/handovers/2026-01-30-diagnostico-sistema-notificaciones-tickets.md`
  - `.cursor/handovers/2026-01-30-diagnostico-sistema-tickets-notificaciones.md`

---

## Comportamiento Esperado

### Nuevo Ticket

| Escenario | Notificados |
|-----------|-------------|
| Sin asignación | Todos los admins (`all_admins`) |
| Con `assigned_to` | Solo el usuario asignado (`specific_user`) |
| Con `assigned_to_role` | Solo usuarios del rol (`role_group`) |
| Reporter es `system` | Nadie |

### Nuevo Comentario

| Quién comenta | Notificados |
|---------------|-------------|
| Admin (público) | Reporter + Admin asignado (si diferente) |
| Admin (interno) | Nadie |
| Cliente, ticket asignado a usuario | Solo el usuario asignado |
| Cliente, ticket asignado a rol | Solo usuarios del rol |
| Cliente, ticket sin asignar | Admins involucrados (que ya vieron el ticket) |

### Reasignación

| Acción | Efecto |
|--------|--------|
| Asignar a usuario | Notifica al nuevo asignado (si no tiene notificación previa) |
| Asignar a rol | Notifica a usuarios del rol (si no tienen notificación previa) |
| Cambiar asignación | Marca como leídas notificaciones de usuarios no asignados |

### Cambio de Estado

| Estado nuevo | Notifica al reporter |
|--------------|---------------------|
| `resuelto` | ✅ Sí |
| `cerrado` | ✅ Sí |
| `cancelado` | ✅ Sí |
| `en_progreso` | ❌ No |
| `pendiente_info` | ❌ No |

---

## Métricas

| Métrica | Antes | Después |
|---------|-------|---------|
| Notificaciones totales | 1,172 | 1,172 |
| Notificaciones no leídas | 587 (50%) | 386 (33%) |
| Tickets con views | 35 | 35 |

---

## Próximos Pasos Sugeridos

1. **Monitorear** el sistema durante 1 semana para verificar que las correcciones funcionan
2. **Crear cron job** para ejecutar `cleanup_old_notifications()` semanalmente
3. **Considerar** agregar notificación al admin desasignado (pendiente)
4. **Optimizar** `getTicketsWithBadges()` en frontend para filtrar en BD

---

**Aplicado por:** AI Assistant  
**Verificado:** ✅ Todos los comandos SQL ejecutados exitosamente
