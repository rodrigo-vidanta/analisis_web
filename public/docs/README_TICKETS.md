# 🎫 Sistema de Tickets de Soporte

**Módulo:** `src/components/support/`  
**Versión:** v1.0.0  
**Fecha:** 20 de Enero 2026  
**Autor:** AI Division

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Funcionalidades](#funcionalidades)
3. [Arquitectura](#arquitectura)
4. [Componentes](#componentes)
5. [Base de Datos](#base-de-datos)
6. [Seguridad](#seguridad)
7. [Notificaciones en Tiempo Real](#notificaciones-en-tiempo-real)
8. [Guía de Uso](#guía-de-uso)
9. [API del Servicio](#api-del-servicio)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

El Sistema de Tickets de Soporte es un módulo completo para la gestión de reportes de fallas y solicitudes de requerimientos. Permite a los usuarios de la plataforma reportar problemas técnicos o solicitar mejoras, mientras que los administradores pueden gestionar, priorizar y resolver estos tickets.

### Características Principales

- ✅ **Captura automática de pantalla** al reportar fallas
- ✅ **Recopilación de contexto** (versión, módulo, navegador, sesión)
- ✅ **Notificaciones en tiempo real** vía Supabase Realtime
- ✅ **Formularios dinámicos** para diferentes tipos de requerimientos
- ✅ **Historial completo** de cambios y comentarios
- ✅ **Comentarios internos** visibles solo para administradores
- ✅ **Seguridad RLS** con políticas granulares

---

## 🚀 Funcionalidades

### Para Usuarios

| Funcionalidad | Descripción |
|---------------|-------------|
| Reportar Falla | Captura de pantalla automática + contexto |
| Crear Requerimiento | Formulario guiado por categorías |
| Ver Mis Tickets | Lista de tickets propios con estados |
| Agregar Comentarios | Responder a tickets |
| Notificaciones | Badge en tiempo real de actualizaciones |

### Para Administradores

| Funcionalidad | Descripción |
|---------------|-------------|
| Ver Todos los Tickets | Lista completa con filtros |
| Cambiar Status | Flujo de estados del ticket |
| Cambiar Prioridad | baja → normal → alta → urgente |
| Asignar Tickets | Asignar a usuarios específicos |
| Comentarios Internos | Notas visibles solo para admins |
| Historial | Ver todos los cambios del ticket |

---

## 🏗️ Arquitectura

### Diagrama de Flujo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     USUARIO     │────▶│  SupportButton  │────▶│ ReportIssue/    │
│                 │     │   (Header)      │     │ RequestModal    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MyTickets     │◀────│  ticketService  │◀────│   Supabase      │
│     Modal       │     │                 │     │   (PQNC_AI)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     ADMIN       │────▶│ AdminTickets    │────▶│  Triggers       │
│                 │     │    Panel        │     │  Notifications  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript + TailwindCSS |
| Animaciones | Framer Motion |
| Screenshots | html2canvas |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (auth.uid()) |
| Realtime | Supabase Realtime (WebSocket) |
| Storage | Supabase Storage |

---

## 🧩 Componentes

### SupportButton.tsx

Botón de "salvavidas" ubicado en el header principal.

```typescript
interface SupportButtonProps {
  currentModule?: string;      // Módulo actual
  prospectoId?: string;        // ID del prospecto (si aplica)
  prospectoNombre?: string;    // Nombre del prospecto
}
```

**Características:**
- Icono de salvavidas vectorizado
- Menú desplegable con 3 opciones
- Badge con contador de notificaciones
- Suscripción a Realtime para actualizaciones

### ReportIssueModal.tsx

Modal para reportar fallas técnicas.

**Flujo:**
1. Captura de pantalla automática al abrir
2. Muestra información de contexto (versión, módulo, etc.)
3. Campo obligatorio de descripción
4. Sube screenshot a Storage
5. Crea ticket con toda la información

### RequestModal.tsx

Modal para solicitar requerimientos.

**Categorías:**
1. Reasignación de prospectos
2. Cambio de roles
3. Bloquear usuario
4. Añadir funciones
5. Mejorar funciones existentes
6. Otro

**Flujo:**
1. Selección de categoría
2. Selección de subcategoría
3. Preguntas específicas (dinámicas)
4. Campo de descripción adicional
5. Creación del ticket

### MyTicketsModal.tsx

Modal para que usuarios vean sus tickets.

**Características:**
- Lista de tickets propios
- Filtros (Todos, Abiertos, Cerrados)
- Vista detallada con comentarios
- Agregar nuevos comentarios

### AdminTicketsPanel.tsx

Panel completo de administración.

**Características:**
- Estadísticas por estado
- Filtros (estado, tipo, búsqueda)
- Lista de tickets con preview
- Panel lateral de detalle
- Cambio de status/prioridad
- Comentarios (públicos e internos)
- Historial de cambios

---

## 🗃️ Base de Datos

### Diagrama ER

```
┌─────────────────────────┐
│    support_tickets      │
├─────────────────────────┤
│ id (PK)                 │
│ ticket_number           │
│ type                    │
│ category                │
│ subcategory             │
│ status                  │
│ priority                │
│ title                   │
│ description             │
│ app_version             │
│ user_agent              │
│ current_module          │
│ prospecto_id            │
│ prospecto_nombre        │
│ session_details (JSONB) │
│ screenshot_url          │
│ form_data (JSONB)       │
│ reporter_id (FK)        │
│ assigned_to (FK)        │
│ created_at              │
│ updated_at              │
│ resolved_at             │
│ closed_at               │
└──────────┬──────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ support_ticket_comments │     │ support_ticket_history  │
├─────────────────────────┤     ├─────────────────────────┤
│ id (PK)                 │     │ id (PK)                 │
│ ticket_id (FK)          │     │ ticket_id (FK)          │
│ user_id                 │     │ user_id                 │
│ user_name               │     │ user_name               │
│ user_role               │     │ action                  │
│ content                 │     │ old_value               │
│ is_internal             │     │ new_value               │
│ created_at              │     │ notes                   │
└─────────────────────────┘     │ created_at              │
                                └─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────┐
│ support_ticket_notifications│
├─────────────────────────────┤
│ id (PK)                     │
│ user_id                     │
│ ticket_id (FK)              │
│ type                        │
│ message                     │
│ is_read                     │
│ created_at                  │
└─────────────────────────────┘
```

### Índices

```sql
idx_tickets_reporter   ON support_tickets(reporter_id)
idx_tickets_assigned   ON support_tickets(assigned_to)
idx_tickets_status     ON support_tickets(status)
idx_tickets_type       ON support_tickets(type)
idx_tickets_created    ON support_tickets(created_at DESC)
idx_comments_ticket    ON support_ticket_comments(ticket_id)
idx_history_ticket     ON support_ticket_history(ticket_id)
idx_notifications_user ON support_ticket_notifications(user_id, is_read)
```

---

## 🔒 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con las siguientes políticas:

| Tabla | Política | Condición |
|-------|----------|-----------|
| `support_tickets` | SELECT | `reporter_id = auth.uid() OR is_support_admin()` |
| `support_tickets` | INSERT | `reporter_id = auth.uid()` |
| `support_tickets` | UPDATE | `is_support_admin()` |
| `support_tickets` | DELETE | `is_support_admin()` |
| **`support_ticket_comments`** | **SELECT** | **Owner ticket + no interno** OR admin |
| **`support_ticket_comments`** | **INSERT** | **Owner ticket + user_id = auth.uid() + no interno** |
| **`support_ticket_comments`** | **ALL** | **is_admin (acceso completo)** |
| `support_ticket_notifications` | SELECT/UPDATE | `user_id = auth.uid()` |

#### 🆕 Actualización RLS (02-02-2026)

**Políticas actualizadas en `support_ticket_comments`:**

1. **`RLS: users can read own ticket comments`** (SELECT)
   - Usuarios ven comentarios públicos de sus tickets
   - Excluye `is_internal = TRUE`

2. **`RLS: users can add comments to own tickets`** (INSERT)
   - Usuarios pueden comentar sus tickets
   - Fuerza `is_internal = FALSE`
   - Permite `.insert().select().single()` (fix 404)

3. **`RLS: admins full access to comments`** (ALL)
   - Admins ven y gestionan todos los comentarios
   - Incluye comentarios internos

**Fix aplicado:**
- ✅ Error 404 al enviar comentarios (corregido)
- ✅ SELECT inmediato después de INSERT (ahora permitido)
- ✅ Seguridad mantenida (usuarios no ven internos)

**Script:** `scripts/sql/fix_support_ticket_comments_rls.sql`
| `support_tickets` | DELETE | `is_support_admin()` |
| `support_ticket_comments` | SELECT | Owner (no internos) OR admin |
| `support_ticket_notifications` | SELECT/UPDATE | `user_id = auth.uid()` |

### Función is_support_admin()

```sql
CREATE FUNCTION is_support_admin() RETURNS BOOLEAN
SECURITY DEFINER  -- Ejecuta con permisos elevados
AS $$
  -- Verifica si el usuario es admin, admin_op o developer
  -- Retorna TRUE/FALSE (no expone datos)
$$;
```

### Roles con Acceso Administrativo

| Rol | ID | Descripción |
|-----|------|-------------|
| admin | `12690827-493e-447b-ac2f-40174fe17389` | Administrador general |
| administrador_operativo | `34cc26d1-8a96-4be2-833e-7a13d5553722` | Admin operativo |
| developer | `59386336-794d-40de-83a4-de73681d6904` | Desarrollador |

### Storage

| Bucket | Público | Políticas |
|--------|---------|-----------|
| `support-tickets` | ✅ | INSERT: authenticated, SELECT: public |
| `user-avatars` | ✅ | INSERT: authenticated, SELECT: public |

---

## 🔔 Notificaciones en Tiempo Real

### Arquitectura

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Trigger SQL    │────▶│   Notificación   │────▶│    Realtime      │
│  (INSERT/UPDATE) │     │    (INSERT)      │     │   (WebSocket)    │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │   SupportButton  │
                                                  │   Badge Update   │
                                                  └──────────────────┘
```

### Triggers

| Trigger | Evento | Acción |
|---------|--------|--------|
| `trigger_notify_new_ticket` | INSERT on support_tickets | Notifica a todos los admins |
| `trigger_notify_status_change` | UPDATE on support_tickets | Notifica al reporter (si status cambió) |
| `trigger_notify_new_comment` | INSERT on support_ticket_comments | Notifica al destinatario |

### Tipos de Notificación

| Tipo | Descripción | Destinatario |
|------|-------------|--------------|
| `new_ticket` | Nuevo ticket creado | Admins |
| `status_change` | Estado cambió | Reporter |
| `new_comment` | Nuevo comentario | Reporter o Admins |
| `assigned` | Ticket asignado | Usuario asignado |

### Uso en Frontend

```typescript
// Suscribirse
useEffect(() => {
  const channel = ticketService.subscribeToNotifications(userId, (notification) => {
    setCount(prev => prev + 1);
  });
  
  return () => ticketService.unsubscribeFromNotifications(channel);
}, [userId]);

// Marcar como leídas
await ticketService.markTicketNotificationsAsRead(userId, ticketId);
```

---

## 📖 Guía de Uso

### Reportar una Falla

1. Click en el icono de salvavidas (🛟) en el header
2. Seleccionar "Reporte de Falla"
3. Esperar captura de pantalla automática
4. Verificar información de contexto
5. Describir el problema detalladamente
6. Click en "Enviar Reporte"

### Crear un Requerimiento

1. Click en el icono de salvavidas (🛟) en el header
2. Seleccionar "Requerimiento"
3. Elegir categoría del requerimiento
4. Elegir subcategoría
5. Responder preguntas específicas
6. Agregar descripción adicional
7. Click en "Enviar Requerimiento"

### Ver Mis Tickets

1. Click en el icono de salvavidas (🛟)
2. Seleccionar "Mis Tickets"
3. Usar filtros para buscar
4. Click en un ticket para ver detalles
5. Agregar comentarios si es necesario

### Gestionar Tickets (Admin)

1. Ir a Mensajes de Administración
2. Seleccionar pestaña "Tickets de Soporte"
3. Usar filtros para encontrar tickets
4. Seleccionar ticket para ver detalles
5. Cambiar status/prioridad según sea necesario
6. Agregar comentarios (públicos o internos)

---

## 🔧 API del Servicio

### ticketService

```typescript
import { ticketService } from '../services/ticketService';

// ============================================
// CRUD DE TICKETS
// ============================================

// Crear ticket
const { ticket, error } = await ticketService.createTicket({
  type: 'reporte_falla',
  title: 'Título del ticket',
  description: 'Descripción detallada',
  priority: 'normal',
  app_version: 'B6.0.3N6.0.0',
  current_module: 'Live Monitor',
  screenshot_url: 'https://...',
  reporter_id: userId,
  reporter_name: 'Nombre',
  reporter_email: 'email@test.com',
  reporter_role: 'coordinador'
});

// Obtener mis tickets
const { tickets, error } = await ticketService.getMyTickets(userId);

// Obtener todos los tickets (admin)
const { tickets, error } = await ticketService.getAllTickets({
  status: ['abierto', 'en_progreso'],
  type: 'reporte_falla',
  search: 'término'
});

// Actualizar status
const { ticket, error } = await ticketService.updateTicketStatus(
  ticketId,
  'resuelto',
  userId,
  'Nombre Admin'
);

// ============================================
// COMENTARIOS
// ============================================

// Obtener comentarios
const { comments, error } = await ticketService.getTicketComments(ticketId);

// Agregar comentario
const { comment, error } = await ticketService.addComment(
  ticketId,
  userId,
  'Nombre',
  'coordinador',
  'Contenido del comentario',
  false // is_internal
);

// ============================================
// NOTIFICACIONES
// ============================================

// Obtener conteo no leído
const { count, error } = await ticketService.getUnreadNotificationCount(userId);

// Marcar como leídas (por ticket)
await ticketService.markTicketNotificationsAsRead(userId, ticketId);

// Marcar todas como leídas
await ticketService.markAllNotificationsAsRead(userId);

// Suscribirse a Realtime
const channel = ticketService.subscribeToNotifications(userId, (notification) => {
  console.log('Nueva notificación:', notification);
});

// Desuscribirse
ticketService.unsubscribeFromNotifications(channel);
```

---

## 🔍 Troubleshooting

### Problema: No aparece el botón de soporte

**Causa:** El usuario no tiene un rol permitido.

**Solución:** Verificar que el `user.role_name` sea uno de:
- `admin`
- `administrador_operativo`
- `coordinador`
- `supervisor`
- `ejecutivo`

### Problema: Error al crear ticket

**Causa:** Falta información requerida o error de RLS.

**Solución:**
1. Verificar que `reporter_id` sea el `auth.uid()` del usuario
2. Verificar campos obligatorios: `type`, `title`, `description`
3. Revisar consola para errores de Supabase

### Problema: No llegan notificaciones

**Causa:** WebSocket no conectado o trigger no ejecutándose.

**Solución:**
1. Verificar que Realtime esté habilitado en la tabla
2. Revisar que el channel esté suscrito correctamente
3. Verificar logs de triggers en Supabase Dashboard

### Problema: Screenshot no se sube

**Causa:** Error en Storage o política de bucket.

**Solución:**
1. Verificar que el bucket `support-tickets` exista
2. Verificar políticas de INSERT para authenticated
3. Revisar tamaño del archivo (máx 10MB)

---

## 📚 Referencias

- **Reglas Cursor:** `.cursor/rules/tickets-system.mdc`
- **Changelog:** `src/components/support/CHANGELOG_TICKETS.md`
- **Servicio:** `src/services/ticketService.ts`
- **Migraciones:** `migrations/20260120_*.sql`

---

**Documentación actualizada:** 20 de Enero 2026
