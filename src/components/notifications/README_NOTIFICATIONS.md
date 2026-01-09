# Sistema de Notificaciones - Estilo Redes Sociales

## Descripción

Sistema de notificaciones en tiempo real que simula la experiencia de redes sociales. Notifica a coordinadores y ejecutivos sobre nuevos prospectos asignados.

## Arquitectura

### Componentes

| Archivo | Descripción |
|---------|-------------|
| `NotificationSystem.tsx` | Componente principal (Bell, Dropdown, Toast) |
| `notificationsService.ts` | Servicio de notificaciones (fetch, realtime) |
| `notificationStore.ts` | Estado global Zustand |
| `automationService.ts` | Integración automática con asignaciones |

### Bases de Datos

- **Tabla `user_notifications`**: PQNC_AI (`glsmifhkoaifvaegsozd`)
- **Usuarios y roles**: SystemUI (`zbylezfyagwrxoecioup`)

## Flujo de Notificaciones

### 1. Nuevo Prospecto → Coordinadores

```
Prospecto creado
  ↓
automationService.processNewProspect()
  ↓
assignmentService.assignProspectToCoordinacion()
  ↓
automationService.notifyCoordinadores()
  ↓
INSERT en user_notifications
  ↓
Supabase Realtime → Frontend
  ↓
Toast + Sonido + Contador
```

### 2. Prospecto Asignado → Ejecutivo

```
Prospecto con ID CRM
  ↓
automationService.processProspectWithCRM()
  ↓
assignmentService.checkAndAssignProspectWithCRM()
  ↓
automationService.notifyEjecutivo()
  ↓
INSERT en user_notifications
  ↓
Supabase Realtime → Frontend
  ↓
Toast + Sonido + Contador
```

## Roles y Notificaciones

### Reciben Notificaciones

| Rol | Cuándo |
|-----|--------|
| Coordinador (operativo) | Nuevo prospecto en su coordinación |
| Supervisor | Nuevo prospecto en su coordinación |
| Ejecutivo | Prospecto asignado a ellos |

### NO Reciben Notificaciones

- Administradores
- Coordinadores de Calidad
- Administradores Operativos
- Developers
- Evaluadores

## UI/UX

### Toast Flotante

- Posición: Esquina superior derecha
- Animación: Slide desde la derecha
- Duración: 5 segundos (auto-ocultar)
- Barra de progreso animada
- Sonido: `/sounds/notification.mp3`

### Campana de Notificaciones

- Contador con badge animado
- Dropdown con lista de notificaciones
- Click → navega a conversación WhatsApp
- Notificación se elimina al hacer click

## Esquema de BD

```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'nuevo_prospecto',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Realtime habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

## Configuración Técnica

### Cliente Supabase

El servicio usa un cliente con `service_role` key para:
- Bypasear RLS en queries
- Suscripciones realtime sin restricciones

### Sonido de Notificación

```typescript
const audio = new Audio('/sounds/notification.mp3');
audio.play();
```

## Uso

El componente se integra automáticamente en `Header.tsx`:

```tsx
import { NotificationSystem } from './notifications';

// En el header
<NotificationSystem onNavigateToProspecto={(id) => {
  // Navegar a live-chat con el prospecto
}} />
```

## Changelog

### v2.2.38 (2026-01-09)
- ✨ Sistema de notificaciones inicial
- 🔔 Toast flotante superior derecha
- 🔊 Sonido de notificación
- 🔄 Integración realtime con Supabase
- 📱 Integración automática en asignaciones
