# 📝 Changelog - Sistema de Tickets de Soporte

**Módulo:** `src/components/support/`  
**Proyecto:** PQNC QA AI Platform

---

## [1.1.0] - 2026-01-20

### 🎨 Rediseño Completo de UI/UX

**Descripción:** Rediseño profesional de todo el ecosistema de tickets para alinearlo con los estándares de diseño de la plataforma.

#### ✨ Mejoras Visuales

**MyTicketsModal.tsx:**
- Header premium con gradiente de indigo a púrpura y patrón SVG
- Cards de tickets con bordes, indicadores de estado y animaciones hover
- Estadísticas rápidas con filtros interactivos (Total, Activos, Cerrados)
- Vista de conversación tipo chat con burbujas de mensajes
- Indicadores visuales claros de prioridad y tipo de ticket
- Timestamps relativos inteligentes ("Ahora", "Hace 5m", "Ayer")
- Estados con iconos SVG animados (spinner para "En Progreso")
- Loading states con animaciones elegantes

**AdminTicketsPanel.tsx:**
- Dashboard completo tipo CRM con header de estadísticas
- 6 cards de métricas por estado con gradientes y hover effects
- Búsqueda avanzada con icono integrado
- Filtros por tipo (Fallas/Requerimientos) con limpiar filtros
- Lista de tickets compacta con indicadores de puntos de color
- Vista split responsiva (lista + detalle)
- Tabs para organizar contenido (Detalles, Historial, Técnico)
- Timeline visual para historial de cambios
- Selector de estado integrado con gradientes
- Empty states ilustrados cuando no hay tickets seleccionados

**SupportButton.tsx:**
- Menú desplegable premium con header gradiente
- Cards de opciones con iconos en gradiente y hover animations
- Badge de notificaciones con sombra y animación pulse
- Footer informativo sobre tiempo de respuesta
- Transiciones suaves con Framer Motion

**ReportIssueModal.tsx:**
- Header con gradiente rojo-naranja y patrón
- Selector de prioridad visual con iconos (Normal, Alta, Urgente)
- Sección de contexto con grid de 4 columnas
- Tips de reporte en card destacado
- Captura de pantalla con overlay hover
- Loading states mejorados

**RequestModal.tsx:**
- Progress steps visuales con checkmarks
- Cards de categorías con iconos en gradiente
- Transiciones animadas entre pasos
- Subcategorías numeradas con animación hover
- Formulario con validación visual

#### 🎯 Mejoras de UX

- Animaciones de entrada/salida en todos los modales
- Estados hover claros en todos los elementos interactivos
- Responsive design mejorado (mobile-first)
- Dark mode completamente implementado
- Scrollbars personalizados con Tailwind
- Feedback visual instantáneo en todas las acciones
- Tecla Enter para enviar comentarios
- Clic fuera para cerrar modales

#### 🏗️ Aspectos Técnicos

- Uso de `createPortal` para z-index correcto
- Animaciones con `framer-motion` y `AnimatePresence`
- Estados con `useState` y `useCallback` optimizados
- Gradientes CSS con variables Tailwind
- SVG patterns para texturas de fondo

---

## [1.0.2] - 2026-01-20

### 🐛 Fix CSP Violation

**Problema:** El Content Security Policy de producción bloqueaba `fetch()` hacia URLs `data:image/...` al subir screenshots.

**Error:**
```
'data:image/jpeg;base64,...' violates Content Security Policy directive: "connect-src 'self' https://*.supabase.co..."
```

**Solución:** Reemplazar `fetch(base64Data)` por función nativa `base64ToBlob()` que usa `atob()` + `Uint8Array`.

---

## [1.0.1] - 2026-01-20

### 🐛 Fix CORS en Captura de Pantalla

**Problema:** `html2canvas` fallaba al intentar cargar imágenes de WhatsApp desde Google Cloud Storage que no tienen CORS habilitado.

**Error:**
```
Access to image at 'https://storage.googleapis.com/whatsapp_pqnc_multimedia/...' has been blocked by CORS policy
```

**Solución:**
- Cambiar `allowTaint: false` para evitar errores de canvas contaminado
- Agregar handler `onclone` que reemplaza imágenes externas por placeholders
- Implementar fallback que captura sin imágenes si falla
- Permitir envío de ticket aunque la captura falle

---

## [1.0.0] - 2026-01-20

### 🎉 Release Inicial

Primera versión del Sistema de Tickets de Soporte.

#### ✨ Nuevas Funcionalidades

**Componentes UI:**
- `SupportButton.tsx` - Botón salvavidas en header con menú desplegable
- `ReportIssueModal.tsx` - Modal de reporte de fallas con captura de pantalla
- `RequestModal.tsx` - Modal de requerimientos con formulario dinámico
- `MyTicketsModal.tsx` - Modal para usuarios ver sus tickets
- `AdminTicketsPanel.tsx` - Panel completo de administración de tickets

**Servicio:**
- `ticketService.ts` - Servicio completo para gestión de tickets
  - CRUD de tickets
  - Gestión de comentarios
  - Historial de cambios
  - Sistema de notificaciones en tiempo real

**Base de Datos:**
- Tabla `support_tickets` - Tickets principales
- Tabla `support_ticket_comments` - Comentarios y respuestas
- Tabla `support_ticket_history` - Historial de cambios
- Tabla `support_ticket_attachments` - Archivos adjuntos
- Tabla `support_ticket_notifications` - Notificaciones realtime

**Seguridad:**
- RLS habilitado en todas las tablas
- Función `is_support_admin()` con SECURITY DEFINER
- Políticas granulares por rol y propiedad

**Notificaciones:**
- Trigger `notify_new_ticket` - Notifica admins de nuevos tickets
- Trigger `notify_status_change` - Notifica usuarios de cambios de estado
- Trigger `notify_new_comment` - Notifica de nuevos comentarios
- Suscripción Realtime vía WebSocket

**Storage:**
- Bucket `support-tickets` para screenshots (10MB máx)
- Bucket `user-avatars` para fotos de perfil (5MB máx)
- Políticas de storage para usuarios autenticados

#### 📁 Archivos Creados

```
src/components/support/
├── index.ts
├── SupportButton.tsx
├── ReportIssueModal.tsx
├── RequestModal.tsx
├── MyTicketsModal.tsx
├── AdminTicketsPanel.tsx
├── README_TICKETS.md
└── CHANGELOG_TICKETS.md

src/services/
└── ticketService.ts (modificado)

migrations/
├── 20260120_support_tickets_system.sql
├── 20260120_fix_rls_policies.sql
├── 20260120_storage_policies.sql
└── 20260120_realtime_notifications.sql

.cursor/rules/
└── tickets-system.mdc
```

#### 🔧 Configuración Técnica

| Componente | Configuración |
|------------|---------------|
| Captura de Pantalla | html2canvas con scale 0.8 |
| Formato Ticket Number | TKT-YYYYMMDD-XXXX |
| Estados | abierto, en_progreso, pendiente_info, resuelto, cerrado, cancelado |
| Prioridades | baja, normal, alta, urgente |
| Tipos | reporte_falla, requerimiento |
| Categorías Requerimiento | 6 categorías con subcategorías |

#### 🔒 Seguridad Implementada

- ✅ RLS en todas las tablas de tickets
- ✅ Función SECURITY DEFINER para verificar admins
- ✅ Screenshots en Storage (no Base64 en BD)
- ✅ Solo `anon_key` en frontend
- ✅ Políticas de storage para authenticated
- ✅ Comentarios internos solo visibles para admins

#### 📊 Roles con Acceso

| Rol | Ver Tickets | Crear | Gestionar |
|-----|-------------|-------|-----------|
| admin | ✅ Todos | ✅ | ✅ |
| administrador_operativo | ✅ Todos | ✅ | ✅ |
| developer | ✅ Todos | ✅ | ✅ |
| coordinador | ✅ Propios | ✅ | ❌ |
| supervisor | ✅ Propios | ✅ | ❌ |
| ejecutivo | ✅ Propios | ✅ | ❌ |

---

## Próximas Mejoras Planificadas

### v1.2.0 (Pendiente)
- [ ] Asignación automática de tickets por categoría
- [ ] SLA y métricas de tiempo de respuesta
- [ ] Exportación de reportes en PDF
- [ ] Templates de respuestas predefinidas

### v1.3.0 (Pendiente)
- [ ] Integración con N8N para automatizaciones
- [ ] Notificaciones por email
- [ ] Dashboard de métricas de soporte
- [ ] Escalamiento automático por prioridad

---

## Historial de Migraciones SQL

| Fecha | Archivo | Descripción | Estado |
|-------|---------|-------------|--------|
| 2026-01-20 | `20260120_support_tickets_system.sql` | Tablas principales | ✅ Ejecutado |
| 2026-01-20 | `20260120_fix_rls_policies.sql` | Corrección políticas RLS | ✅ Ejecutado |
| 2026-01-20 | `20260120_storage_policies.sql` | Políticas de Storage | ✅ Ejecutado |
| 2026-01-20 | `20260120_realtime_notifications.sql` | Sistema notificaciones | ✅ Ejecutado |

---

## Notas de Desarrollo

### Decisiones de Arquitectura

1. **Screenshot en Storage vs Base64**: Se optó por subir screenshots a Supabase Storage en lugar de guardarlos como Base64 en la BD. Esto mejora el rendimiento y reduce el tamaño de las consultas.

2. **Función SECURITY DEFINER**: `is_support_admin()` usa SECURITY DEFINER porque necesita acceder a `auth_users.role_id` que está protegido por RLS. La función solo retorna TRUE/FALSE, no expone datos.

3. **Triggers para Notificaciones**: Los triggers en PostgreSQL garantizan que las notificaciones se creen atómicamente con las operaciones de tickets, evitando condiciones de carrera.

4. **Realtime por Usuario**: Cada usuario se suscribe a su propio canal filtrado por `user_id`, reduciendo el tráfico de WebSocket.

### Dependencias

```json
{
  "html2canvas": "^1.4.1",
  "framer-motion": "^10.x",
  "@supabase/supabase-js": "^2.x"
}
```

---

**Última Actualización:** 20 de Enero 2026
