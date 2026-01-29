# Sistema de Notificaciones de Plantillas Aprobadas

## 📋 Descripción General

Este sistema notifica automáticamente a los usuarios cuando sus plantillas sugeridas son aprobadas en uChat.

---

## 🔄 Flujo Completo

### 1. Usuario Sugiere Plantilla

**Quién:** Ejecutivo, Coordinador, Supervisor  
**Dónde:** Módulo de Campañas > Plantillas > Sugerencias  
**Acción:** Propone una nueva plantilla de WhatsApp

```typescript
// Tabla: whatsapp_template_suggestions
{
  id: UUID,
  name: "Nombre de la plantilla",
  template_text: "Texto con variables {{1}}",
  justification: "Razón de la sugerencia",
  suggested_by: UUID, // ID del usuario
  status: "PENDING"
}
```

### 2. Administrador Aprueba

**Quién:** Administrador  
**Acción:** Revisa y aprueba la sugerencia internamente

```sql
UPDATE whatsapp_template_suggestions
SET status = 'APPROVED', reviewed_by = admin_id
WHERE id = suggestion_id;
```

### 3. Administrador Importa Plantilla

**Quién:** Administrador  
**Acción:** Importa la sugerencia al gestor de plantillas

- Revisa ortografía y gramática
- Añade etiquetas (tags)
- Revisa y mapea variables
- Guarda la plantilla

```typescript
// Tabla: whatsapp_templates
{
  id: UUID,
  name: "Nombre final",
  status: "PENDING", // Esperando aprobación de uChat
  uchat_synced: false
}

// Se vincula con la sugerencia
UPDATE whatsapp_template_suggestions
SET imported_to_template_id = template_id
WHERE id = suggestion_id;
```

### 4. uChat Aprueba Plantilla

**Cuándo:** Webhook de uChat responde con status "APPROVED"  
**Acción Automática:** Sistema actualiza plantilla

```sql
UPDATE whatsapp_templates
SET status = 'APPROVED', uchat_synced = true
WHERE id = template_id;
```

### 5. ⚡ Trigger Automático de Notificación

**Momento:** Cuando `whatsapp_templates.status` cambia a `'APPROVED'`  
**Función:** `notify_template_approval()`

```sql
-- El trigger ejecuta automáticamente:
INSERT INTO user_notifications (
  user_id,                    -- Usuario que sugirió
  notification_type,          -- 'template_approved'
  module,                     -- 'campaigns'
  customer_name,              -- Nombre de la plantilla
  message_preview,            -- Mensaje de notificación
  metadata                    -- Datos extra (IDs, timestamps)
) VALUES (...);
```

### 6. Usuario Recibe Notificación

**Dónde:** Header > Ícono de campana 🔔  
**Mensaje:** "Tu plantilla '{nombre}' fue aprobada y ya está disponible para usar"

---

## 🗄️ Tablas Involucradas

### whatsapp_template_suggestions

```sql
CREATE TABLE whatsapp_template_suggestions (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  template_text TEXT,
  suggested_by UUID,              -- Usuario que sugirió
  status VARCHAR(50),             -- PENDING, APPROVED, REJECTED
  imported_to_template_id UUID,   -- ⚡ Link con plantilla creada
  created_at TIMESTAMPTZ
);
```

### whatsapp_templates

```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  status VARCHAR(50),       -- ⚡ Trigger cuando cambia a APPROVED
  uchat_synced BOOLEAN,
  created_at TIMESTAMPTZ
);
```

### user_notifications

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID,                        -- Usuario que recibe
  notification_type VARCHAR(50),       -- 'template_approved' ⚡ NUEVO
  module VARCHAR(50),                  -- 'campaigns' ⚡ NUEVO
  customer_name VARCHAR(255),          -- Nombre de plantilla
  message_preview TEXT,                -- Mensaje completo
  metadata JSONB,                      -- template_id, suggestion_id
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
);
```

---

## 🔧 Componentes Técnicos

### Trigger SQL

```sql
CREATE TRIGGER trigger_notify_template_approval
  AFTER UPDATE OF status ON whatsapp_templates
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND OLD.status != 'APPROVED')
  EXECUTE FUNCTION notify_template_approval();
```

### Función notify_template_approval()

**Ubicación:** `scripts/sql/setup_template_approval_notifications.sql`

**Lógica:**
1. Detecta cambio de status a `APPROVED`
2. Busca sugerencia vinculada (`imported_to_template_id`)
3. Obtiene `suggested_by` (usuario que sugirió)
4. Inserta notificación en `user_notifications`

### Servicio Frontend

**Archivo:** `src/services/userNotificationService.ts`

**Tipos Actualizados:**
```typescript
notification_type: 'new_message' | 'new_call' | 'template_approved'
module: 'live-chat' | 'live-monitor' | 'campaigns'

interface NotificationCounts {
  templatesApproved: number; // ⚡ NUEVO
}
```

**Método Nuevo:**
```typescript
markTemplateNotificationsAsRead(templateId?: string): Promise<boolean>
```

---

## 📝 Scripts de Configuración

### 1. Setup Inicial

```bash
# Ejecutar en Supabase Dashboard (PQNC_AI)
scripts/sql/setup_template_approval_notifications.sql
```

**Acciones:**
- ✅ Actualiza constraint de `notification_type`
- ✅ Crea función `notify_template_approval()`
- ✅ Crea trigger en `whatsapp_templates`
- ✅ Actualiza constraint de `module`
- ✅ Crea función `create_manual_template_notifications()`

### 2. Disparar Notificaciones Manualmente

```bash
# Para plantillas aprobadas HOY
scripts/sql/execute_manual_template_notifications.sql
```

**SQL Directo:**
```sql
-- Notificaciones de hoy
SELECT * FROM create_manual_template_notifications(CURRENT_DATE);

-- Notificaciones desde una fecha
SELECT * FROM create_manual_template_notifications('2026-01-28 00:00:00+00'::timestamptz);

-- Todas las plantillas aprobadas (historial completo)
SELECT * FROM create_manual_template_notifications('2000-01-01 00:00:00+00'::timestamptz);
```

---

## 🎯 Casos de Uso

### Caso 1: Flujo Automático Normal

```
Usuario sugiere → Admin aprueba → Admin importa → uChat aprueba
                                                     ↓
                                            ⚡ NOTIFICACIÓN AUTOMÁTICA
```

### Caso 2: Notificación Manual (Histórico)

Si algunas plantillas se aprobaron antes de implementar el trigger:

```sql
-- Ejecutar función manual
SELECT * FROM create_manual_template_notifications('2026-01-20 00:00:00+00'::timestamptz);
```

**Protección contra duplicados:** La función valida que no exista notificación previa.

---

## 🔍 Verificación y Debugging

### Ver Plantillas Aprobadas con Sugerencias

```sql
SELECT 
  wt.name AS plantilla,
  wt.status,
  wts.suggested_by,
  au.full_name AS usuario
FROM whatsapp_templates wt
INNER JOIN whatsapp_template_suggestions wts 
  ON wts.imported_to_template_id = wt.id
LEFT JOIN auth_users au ON au.id = wts.suggested_by
WHERE wt.status = 'APPROVED'
ORDER BY wt.created_at DESC;
```

### Ver Notificaciones Creadas

```sql
SELECT 
  un.customer_name AS plantilla,
  au.full_name AS usuario,
  un.is_read,
  un.created_at,
  un.metadata
FROM user_notifications un
LEFT JOIN auth_users au ON au.id = un.user_id
WHERE un.notification_type = 'template_approved'
ORDER BY un.created_at DESC;
```

### Ver Logs del Trigger

```sql
-- En logs de Supabase verás:
-- NOTICE: Notificación creada para usuario [UUID] sobre plantilla [nombre]
```

---

## 🎨 UI/UX

### Ícono de Notificaciones

**Ubicación:** Header > Campana 🔔

**Badge:** Contador incluye:
- Mensajes nuevos (new_message)
- Llamadas activas (new_call)
- **Plantillas aprobadas** (template_approved) ⚡ NUEVO

### Vista de Notificación

```
🎉 Tu plantilla "Confirmación de Cita" fue aprobada y ya está disponible para usar
```

**Metadata Incluida:**
```json
{
  "template_id": "uuid-plantilla",
  "template_name": "Confirmación de Cita",
  "suggestion_id": "uuid-sugerencia",
  "approved_at": "2026-01-28T...",
  "uchat_status": "APPROVED"
}
```

---

## 📊 Métricas

### Contadores en Frontend

```typescript
const counts = await userNotificationService.getUnreadCount();

console.log(counts);
// {
//   total: 5,
//   unread: 5,
//   newMessages: 2,
//   activeCalls: 1,
//   templatesApproved: 2  ⚡ NUEVO
// }
```

### Marcar como Leída

```typescript
// Marcar notificación específica
await userNotificationService.markAsRead(notificationId);

// Marcar todas las de plantillas
await userNotificationService.markAllAsRead('template_approved');

// Marcar plantilla específica
await userNotificationService.markTemplateNotificationsAsRead(templateId);
```

---

## 🚀 Despliegue

### Checklist de Implementación

- [x] Actualizar tabla `user_notifications` (constraints)
- [x] Crear función `notify_template_approval()`
- [x] Crear trigger en `whatsapp_templates`
- [x] Crear función `create_manual_template_notifications()`
- [x] Actualizar `userNotificationService.ts`
- [ ] Ejecutar scripts SQL en producción
- [ ] Disparar notificaciones manuales para plantillas de hoy
- [ ] Verificar que trigger funciona con nueva plantilla
- [ ] Monitorear logs de Supabase

### Comandos de Ejecución

```bash
# 1. Conectar a Supabase Dashboard
# URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd

# 2. Ir a SQL Editor

# 3. Ejecutar setup
# Pegar contenido de: scripts/sql/setup_template_approval_notifications.sql

# 4. Ejecutar notificaciones manuales
# Pegar contenido de: scripts/sql/execute_manual_template_notifications.sql
```

---

## ⚠️ Consideraciones

### Seguridad

- ✅ RLS habilitado en `user_notifications`
- ✅ Usuarios solo ven sus propias notificaciones
- ✅ Solo `service_role` puede insertar notificaciones (trigger)

### Performance

- ✅ Trigger solo se dispara en cambio de status
- ✅ Protección contra duplicados en función manual
- ✅ Índices en columnas filtradas

### Edge Cases

**Caso:** Plantilla sin sugerencia vinculada  
**Comportamiento:** Trigger no crea notificación (esperado)

**Caso:** Usuario eliminado  
**Comportamiento:** FK con `ON DELETE CASCADE` elimina notificaciones

**Caso:** Ejecutar función manual múltiples veces  
**Comportamiento:** Validación evita duplicados

---

## 📚 Referencias

- [Tabla user_notifications](./create_user_notifications_table.sql)
- [Tabla whatsapp_template_suggestions](../create_whatsapp_template_suggestions_table.sql)
- [Servicio Frontend](../../src/services/userNotificationService.ts)
- [Servicio de Sugerencias](../../src/services/whatsappTemplateSuggestionsService.ts)

---

**Última actualización:** 29 de Enero 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Implementado - Pendiente Deploy
