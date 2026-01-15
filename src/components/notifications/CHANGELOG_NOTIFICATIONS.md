# Changelog - Sistema de Notificaciones

Todos los cambios notables en el sistema de notificaciones serán documentados aquí.

---

## [2.0.0] - 2026-01-15

### ⚠️ CAMBIO ARQUITECTÓNICO MAYOR

**Migración de generación frontend → Trigger de BD**

### Agregado
- **Trigger Unificado**: `trigger_notify_prospecto_changes` reemplaza 3 triggers separados
- **Función Unificada**: `fn_notify_prospecto_changes()` maneja los 3 tipos de notificaciones
- **BD Unificada**: Todo en PQNC_AI (auth_users, auth_roles, auth_user_coordinaciones migradas)

### Cambiado
- **notificationsService.ts**: Simplificado - solo lectura y realtime, sin generación
- **NotificationSystem.tsx**: Removida integración con `useProspectosNotifications`

### Deprecado
- **useProspectosNotifications.ts**: Hook marcado como deprecado, no se usa en producción

### Eliminado
- Dependencias a supabaseSystemUI (todo migrado a PQNC_AI)
- Métodos de generación de notificaciones desde frontend
- 528 notificaciones duplicadas limpiadas

### Corregido
- **Duplicados**: Eliminados completamente - trigger de BD garantiza una sola notificación por evento
- **Cross-database errors**: Ya no existen - todo en una sola BD

---

## [1.0.0] - 2026-01-13

### Agregado
- **NotificationSystem Component**: Componente principal que integra campana, dropdown y toast
- **NotificationBell**: Icono de campana animado con contador de notificaciones no leídas
- **NotificationDropdown**: Lista desplegable de notificaciones con scroll personalizado
- **NotificationToast**: Notificación flotante desde la derecha con animación spring
- **Sonido de notificación**: Audio que se reproduce al recibir notificación en realtime
- **Botón "Limpiar"**: Elimina todas las notificaciones de un usuario

### Triggers de Base de Datos
- `trigger_notify_new_prospecto`: Notifica a coordinadores cuando llega nuevo prospecto
- `trigger_notify_ejecutivo_assigned`: Notifica al ejecutivo cuando se le asigna prospecto
- `trigger_notify_requiere_atencion`: Notifica cuando se activa flag de atención humana

### Tipos de Notificación
| Tipo | Descripción |
|------|-------------|
| `nuevo_prospecto` | Prospecto nuevo en coordinación (icono morado) |
| `prospecto_asignado` | Prospecto asignado a ejecutivo (icono verde) |
| `requiere_atencion` | Requiere atención humana (icono rojo) |

### Funciones PL/pgSQL
- `notify_new_prospecto_to_coordinacion()`: Inserta notificaciones para coordinadores
- `notify_ejecutivo_assigned()`: Inserta notificación para ejecutivo asignado
- `notify_requiere_atencion_humana()`: Inserta notificación de atención urgente

### Correcciones
- Configuración correcta de cliente Supabase (PQNC_AI vs SystemUI)
- RLS deshabilitado en tabla `user_notifications`
- Realtime funcionando con canal único por usuario

---

## Problemas Conocidos Resueltos

### Base de Datos Incorrecta
- **Problema**: El servicio buscaba notificaciones en SystemUI
- **Solución**: Cambiar a `analysisSupabase` (PQNC_AI)

### RLS Bloqueando Acceso
- **Problema**: Row Level Security impedía lectura con anon_key
- **Solución**: Deshabilitar RLS en `user_notifications`

### Realtime No Conectaba
- **Problema**: Canal realtime usaba cliente incorrecto
- **Solución**: Usar `analysisSupabase` para suscripciones

### Audio No Reproducía
- **Problema**: Browser Autoplay Policy
- **Solución**: Resumir AudioContext en primer clic del usuario

---

**Mantenido por:** Team PQNC
