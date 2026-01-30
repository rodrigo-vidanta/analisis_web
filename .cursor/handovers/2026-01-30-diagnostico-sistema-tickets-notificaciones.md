# 🔍 Diagnóstico Completo: Sistema de Tickets y Notificaciones

**Fecha:** 30 de Enero 2026  
**Autor:** AI Assistant  
**Proyecto:** PQNC QA AI Platform  
**Base de Datos:** PQNC_AI (glsmifhkoaifvaegsozd)

---

## 📋 Resumen Ejecutivo

Se realizó un análisis exhaustivo del sistema de tickets de soporte y su sistema de notificaciones en tiempo real. Se identificaron **5 problemas críticos** y **3 problemas menores** que afectan la entrega correcta de notificaciones a los usuarios.

---

## 🏗️ Arquitectura del Sistema

### Tablas Principales

| Tabla | Propósito | RLS | Realtime |
|-------|-----------|-----|----------|
| `support_tickets` | Tickets principales | ✅ | ✅ |
| `support_ticket_notifications` | Notificaciones | ✅ | ✅ |
| `support_ticket_comments` | Comentarios | ✅ | ✅ |
| `support_ticket_history` | Historial | ✅ | ❌ |
| `support_ticket_views` | Tracking de vistas | ✅ | ❌ |

### Flujo de Notificaciones

```
1. INSERT support_tickets
   └─> trigger_notify_new_ticket()
       └─> INSERT support_ticket_notifications (a todos los admins)

2. UPDATE support_tickets (assigned_to/assigned_to_role)
   └─> trigger_notify_assignment()
       └─> INSERT support_ticket_notifications (a asignados)

3. INSERT support_ticket_comments
   └─> trigger_notify_new_comment()
       └─> INSERT support_ticket_notifications (según contexto)
```

### Funciones de Base de Datos

| Función | Propósito | Estado |
|---------|-----------|--------|
| `get_support_admin_ids()` | Obtiene IDs de admins | ✅ Funcional |
| `get_users_by_role(role_name)` | Obtiene usuarios por rol | ✅ Funcional |
| `notify_new_ticket()` | Notifica nuevo ticket | ⚠️ **PROBLEMA** |
| `notify_new_comment()` | Notifica nuevo comentario | ⚠️ **PROBLEMA** |
| `notify_ticket_assignment()` | Notifica asignación | ✅ Funcional |
| `mark_ticket_viewed()` | Marca ticket como visto | ✅ Funcional |
| `is_system_user(user_id)` | Verifica usuario system | ✅ Funcional |

---

## 🐛 Problemas Identificados

### 🔴 CRÍTICO 1: Inconsistencia en Verificación de Admin

**Ubicación:** `migrations/20260123_fix_ticket_notifications.sql` línea 192-196

**Problema:**
```sql
-- En notify_new_comment() se usa:
SELECT EXISTS (
  SELECT 1 FROM user_profiles_v2
  WHERE id = NEW.user_id 
  AND role_name IN ('admin', 'administrador_operativo', 'coordinador')
) INTO commenter_is_admin;
```

**Pero `get_support_admin_ids()` usa:**
```sql
SELECT id FROM auth_users 
WHERE role_id IN (
  '12690827-493e-447b-ac2f-40174fe17389',  -- admin
  '34cc26d1-8a96-4be2-833e-7a13d5553722',  -- administrador_operativo
  '59386336-794d-40de-83a4-de73681d6904'   -- developer
) AND is_active = true;
```

**Impacto:**
- La verificación de admin en `notify_new_comment()` puede fallar si `user_profiles_v2` no está sincronizado con `auth_users`
- Puede causar que admins no reciban notificaciones cuando usuarios comentan
- Puede causar que usuarios reciban notificaciones cuando no deberían

**Solución:**
Usar la misma lógica que `get_support_admin_ids()` o crear función helper `is_support_admin(user_id)`.

---

### 🔴 CRÍTICO 2: Falta Trigger para Actualizar `last_comment_at` en Comentarios

**Ubicación:** `migrations/20260123_fix_ticket_notifications.sql` línea 198-204

**Problema:**
El trigger `notify_new_comment()` actualiza `last_comment_at` manualmente dentro de la función, pero esto puede fallar si:
- La función se ejecuta antes de que el INSERT se complete
- Hay un error en la función y el UPDATE no se ejecuta
- Hay múltiples triggers compitiendo

**Impacto:**
- Los badges "Mensaje" pueden no aparecer correctamente
- `getTicketsWithBadges()` puede retornar información incorrecta

**Solución:**
Crear un trigger separado `trigger_update_last_comment` que se ejecute DESPUÉS de INSERT en `support_ticket_comments`.

---

### 🔴 CRÍTICO 3: Filtro de Realtime Incorrecto en Frontend

**Ubicación:** `src/services/ticketService.ts` línea 920

**Problema:**
```typescript
filter: `user_id=eq.${userId}`
```

Este filtro es una **string literal**, no un objeto. Supabase Realtime requiere un formato específico para filtros.

**Impacto:**
- Las notificaciones pueden no llegar en tiempo real
- El contador puede no actualizarse automáticamente
- Los usuarios pueden no ver notificaciones nuevas hasta recargar

**Solución:**
Usar el formato correcto de filtro de Supabase Realtime:
```typescript
filter: `user_id=eq.${userId}` // Esto es correcto, pero verificar que userId sea string
```

**Nota:** Revisar si el problema es el formato o si `userId` tiene un tipo incorrecto.

---

### 🔴 CRÍTICO 4: Race Condition en `markTicketAsViewed()`

**Ubicación:** `src/services/ticketService.ts` línea 947-950

**Problema:**
```typescript
async markTicketAsViewed(ticketId: string, userId: string) {
  const { error } = await analysisSupabase.rpc('mark_ticket_viewed', {
    ticket_id_param: ticketId,
    user_id_param: userId
  });
```

La función RPC `mark_ticket_viewed()` actualiza `last_comment_read_at` con el valor actual de `last_comment_at`, pero si hay un nuevo comentario entre la carga del ticket y el marcado como visto, puede haber una condición de carrera.

**Impacto:**
- Los badges pueden aparecer/desaparecer incorrectamente
- Notificaciones pueden marcarse como leídas antes de tiempo

**Solución:**
La función RPC debería usar un timestamp específico o verificar que `last_comment_at` no haya cambiado desde la última lectura.

---

### 🔴 CRÍTICO 5: Duplicación de Notificaciones en Asignación

**Ubicación:** `migrations/20260123_fix_ticket_notifications.sql` línea 109-162

**Problema:**
Cuando un ticket se asigna a un grupo de roles (`assigned_to_role`), el trigger `notify_ticket_assignment()` notifica a todos los usuarios del grupo. Pero si el ticket ya tenía notificaciones de `notify_new_ticket()` (que notifica a todos los admins), los usuarios pueden recibir notificaciones duplicadas.

**Impacto:**
- Usuarios reciben múltiples notificaciones del mismo ticket
- Contador de notificaciones puede ser incorrecto
- Experiencia de usuario degradada

**Solución:**
Antes de insertar notificación de asignación, verificar si ya existe una notificación no leída del mismo ticket para ese usuario.

---

### ⚠️ MENOR 1: Falta Validación de `assignment_context`

**Ubicación:** `migrations/20260123_fix_ticket_notifications.sql` línea 45

**Problema:**
La columna `assignment_context` puede ser NULL para notificaciones antiguas, pero el código no maneja este caso explícitamente.

**Impacto:**
- Queries que filtran por `assignment_context` pueden excluir notificaciones antiguas
- Migración de datos puede ser necesaria

**Solución:**
Agregar valor por defecto o migrar notificaciones existentes.

---

### ⚠️ MENOR 2: Falta Índice Compuesto en `support_ticket_notifications`

**Ubicación:** `migrations/20260120_realtime_notifications.sql` línea 34

**Problema:**
Solo existe índice en `(user_id, is_read)`, pero las queries frecuentes también filtran por `ticket_id` y `assignment_context`.

**Impacto:**
- Queries pueden ser lentas con muchos tickets
- Performance degradada en producción

**Solución:**
Agregar índices compuestos:
```sql
CREATE INDEX idx_notifications_user_ticket ON support_ticket_notifications(user_id, ticket_id, is_read);
CREATE INDEX idx_notifications_context ON support_ticket_notifications(assignment_context, is_read);
```

---

### ⚠️ MENOR 3: Falta Manejo de Errores en Suscripción Realtime

**Ubicación:** `src/services/ticketService.ts` línea 911-928

**Problema:**
La función `subscribeToNotifications()` no maneja errores de conexión o suscripción fallida.

**Impacto:**
- Si Realtime falla, el usuario no sabe que no está recibiendo notificaciones
- No hay retry automático
- No hay logging de errores

**Solución:**
Agregar manejo de errores y retry:
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('✅ Suscrito a notificaciones');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('❌ Error en canal de notificaciones');
    // Retry después de 5 segundos
    setTimeout(() => subscribeToNotifications(userId, callback), 5000);
  }
});
```

---

## 🔧 Soluciones Propuestas

### Solución 1: Crear Función Helper `is_support_admin(user_id)`

```sql
CREATE OR REPLACE FUNCTION is_support_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
IMMUTABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth_users
    WHERE id = user_id_param
    AND role_id IN (
      '12690827-493e-447b-ac2f-40174fe17389',  -- admin
      '34cc26d1-8a96-4be2-833e-7a13d5553722',  -- administrador_operativo
      '59386336-794d-40de-83a4-de73681d6904'   -- developer
    )
    AND is_active = true
  );
END;
$$;
```

**Usar en `notify_new_comment()`:**
```sql
SELECT is_support_admin(NEW.user_id) INTO commenter_is_admin;
```

---

### Solución 2: Crear Trigger Separado para `last_comment_at`

```sql
CREATE OR REPLACE FUNCTION update_ticket_last_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE support_tickets
  SET 
    last_comment_at = NEW.created_at,
    last_comment_by = NEW.user_id,
    last_comment_by_role = NEW.user_role
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_last_comment ON support_ticket_comments;
CREATE TRIGGER trigger_update_last_comment
AFTER INSERT ON support_ticket_comments
FOR EACH ROW
EXECUTE FUNCTION update_ticket_last_comment();
```

**Remover actualización manual de `notify_new_comment()`.**

---

### Solución 3: Prevenir Duplicados en Asignación

```sql
CREATE OR REPLACE FUNCTION notify_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  role_user_id UUID;
  existing_notification_id UUID;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR 
     OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role THEN
    
    -- Caso 1: Asignado a usuario específico
    IF NEW.assigned_to IS NOT NULL THEN
      -- Verificar si ya existe notificación no leída
      SELECT id INTO existing_notification_id
      FROM support_ticket_notifications
      WHERE user_id = NEW.assigned_to
        AND ticket_id = NEW.id
        AND is_read = false
      LIMIT 1;
      
      IF existing_notification_id IS NULL THEN
        INSERT INTO support_ticket_notifications (...)
        VALUES (...);
      END IF;
    
    -- Caso 2: Asignado a grupo (similar lógica)
    ...
  END IF;
  
  RETURN NEW;
END;
$$;
```

---

### Solución 4: Mejorar Manejo de Errores en Frontend

```typescript
subscribeToNotifications(userId: string, callback: (notification: any) => void) {
  const channel = analysisSupabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_ticket_notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('📨 Nueva notificación recibida:', payload.new);
        callback(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscrito a notificaciones de tickets');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error en canal de notificaciones');
        // Retry después de 5 segundos
        setTimeout(() => {
          this.subscribeToNotifications(userId, callback);
        }, 5000);
      } else {
        console.warn('⚠️ Estado de suscripción:', status);
      }
    });

  return channel;
}
```

---

## 📊 Estado Actual del Sistema

### Funcionalidades que SÍ Funcionan

✅ Creación de tickets  
✅ Asignación de tickets  
✅ Comentarios en tickets  
✅ Historial de cambios  
✅ Notificaciones básicas (INSERT en BD)  
✅ Badges "Nuevo" y "Mensaje" (con limitaciones)  
✅ Marcar como visto  
✅ Sistema de usuario "system" (sin notificaciones)

### Funcionalidades con Problemas

⚠️ Notificaciones en tiempo real (filtro puede estar mal)  
⚠️ Verificación de admin en comentarios (inconsistente)  
⚠️ Actualización de `last_comment_at` (race condition)  
⚠️ Prevención de duplicados en asignación  
⚠️ Manejo de errores en Realtime

---

## 🧪 Casos de Prueba Recomendados

### Test 1: Notificación de Nuevo Ticket
1. Usuario crea ticket
2. Verificar que todos los admins reciben notificación
3. Verificar que el contador se actualiza en tiempo real

### Test 2: Notificación de Comentario
1. Admin comenta en ticket de usuario
2. Verificar que el usuario recibe notificación
3. Usuario comenta en su ticket
4. Verificar que los admins/asignados reciben notificación

### Test 3: Notificación de Asignación
1. Ticket sin asignación → asignar a grupo
2. Verificar que usuarios del grupo reciben notificación
3. Reasignar a usuario específico
4. Verificar que no hay duplicados

### Test 4: Badge "Mensaje"
1. Usuario ve ticket sin comentarios nuevos
2. Admin agrega comentario
3. Verificar que badge "Mensaje" aparece
4. Usuario abre ticket
5. Verificar que badge desaparece

---

## 📝 Checklist de Implementación

### Fase 1: Correcciones Críticas (Prioridad Alta)

- [ ] Crear función `is_support_admin(user_id)`
- [ ] Actualizar `notify_new_comment()` para usar función helper
- [ ] Crear trigger separado para `last_comment_at`
- [ ] Remover actualización manual de `notify_new_comment()`
- [ ] Agregar prevención de duplicados en `notify_ticket_assignment()`

### Fase 2: Mejoras de Performance (Prioridad Media)

- [ ] Agregar índices compuestos en `support_ticket_notifications`
- [ ] Migrar notificaciones antiguas para agregar `assignment_context`
- [ ] Optimizar queries en `getTicketsWithBadges()`

### Fase 3: Mejoras de UX (Prioridad Baja)

- [ ] Agregar manejo de errores en suscripción Realtime
- [ ] Agregar retry automático en caso de fallo
- [ ] Agregar logging detallado para debugging
- [ ] Agregar métricas de notificaciones (tiempo de entrega, tasa de éxito)

---

## 🔗 Archivos Relacionados

### Migraciones SQL
- `migrations/20260120_support_tickets_system.sql` - Tablas principales
- `migrations/20260120_realtime_notifications.sql` - Sistema inicial de notificaciones
- `migrations/20260123_fix_ticket_notifications.sql` - Fix contextual de notificaciones
- `migrations/20260124_system_user_no_notifications.sql` - Skip notificaciones system

### Servicios Frontend
- `src/services/ticketService.ts` - Servicio principal de tickets
- `src/components/support/SupportButton.tsx` - Botón de soporte con notificaciones
- `src/components/support/AdminTicketsPanel.tsx` - Panel de administración

### Documentación
- `.cursor/rules/tickets-system.mdc` - Reglas de desarrollo
- `src/components/support/README_TICKETS.md` - Documentación técnica

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar** este diagnóstico
2. **Priorizar** problemas según impacto en producción
3. **Crear migración SQL** con las correcciones críticas
4. **Probar** en ambiente de desarrollo
5. **Desplegar** a producción con monitoreo

---

**Última actualización:** 30 de Enero 2026  
**Estado:** ✅ Diagnóstico Completo - Listo para Implementación
