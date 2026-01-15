# Sistema de Notificaciones - PQNC QA AI Platform

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema v2.0](#arquitectura-del-sistema-v20)
3. [Flujo de Datos](#flujo-de-datos)
4. [Componentes Frontend](#componentes-frontend)
5. [Backend y Base de Datos](#backend-y-base-de-datos)
6. [Trigger Unificado](#trigger-unificado)
7. [Tipos de Notificaciones](#tipos-de-notificaciones)
8. [Troubleshooting](#troubleshooting)
9. [Historial de Versiones](#historial-de-versiones)

---

## Resumen Ejecutivo

El sistema de notificaciones proporciona alertas en tiempo real estilo "redes sociales" para coordinadores, supervisores y ejecutivos. Las notificaciones aparecen como:

1. **Bell Icon**: Campanita con contador de no leídas
2. **Dropdown**: Lista desplegable de notificaciones pendientes con botón "Limpiar"
3. **Toast**: Notificación flotante desde la derecha con animación y sonido
4. **Realtime**: Actualizaciones instantáneas via Supabase Realtime

---

## Arquitectura del Sistema v2.0

> **ACTUALIZACIÓN 2026-01-15**: Migración a BD unificada PQNC_AI + Trigger único

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  NotificationSystem.tsx                                             │
│  ├── NotificationBell (campanita + contador)                        │
│  ├── NotificationDropdown (lista + botón Limpiar)                   │
│  └── NotificationToast (alerta flotante)                            │
│                                                                     │
│  notificationStore.ts (Zustand)                                     │
│  ├── notifications[]                                                │
│  ├── unreadCount                                                    │
│  ├── toastNotification                                              │
│  └── playNotificationSound()                                        │
│                                                                     │
│  notificationsService.ts (SIMPLIFICADO v2.0)                        │
│  ├── getUnreadNotifications()                                       │
│  ├── markAsReadAndDelete()                                          │
│  ├── markAllAsRead() ← BOTÓN LIMPIAR                                │
│  └── subscribeToUserNotifications() ← REALTIME                      │
│                                                                     │
│  ⚠️ useProspectosNotifications.ts (DEPRECADO)                       │
│     Ya no genera notificaciones - todo lo maneja el trigger de BD   │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ Supabase Realtime (WebSocket)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE - PQNC_AI (UNIFICADA)                   │
│                (glsmifhkoaifvaegsozd.supabase.co)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TABLA: prospectos                                                  │
│  ├── id, nombre_completo, coordinacion_id, ejecutivo_id            │
│  ├── requiere_atencion_humana, motivo_handoff                       │
│  └── ... otros campos ...                                           │
│                                                                     │
│  TRIGGER: trigger_notify_prospecto_changes ◀────────────────────    │
│  ├── Evento: AFTER INSERT OR UPDATE OF ejecutivo_id,                │
│  │           requiere_atencion_humana                               │
│  └── Función: fn_notify_prospecto_changes()                         │
│                                                                     │
│  FUNCIÓN: fn_notify_prospecto_changes() ────────────────────────    │
│  ├── CASO 1: INSERT + coordinacion_id + no ejecutivo                │
│  │           → Notifica a coordinadores/supervisores                │
│  ├── CASO 2: UPDATE ejecutivo_id (null → valor)                     │
│  │           → Notifica al ejecutivo asignado                       │
│  └── CASO 3: UPDATE requiere_atencion_humana (false → true)         │
│              → Notifica a ejecutivo o coordinadores                 │
│                                                                     │
│  TABLA: user_notifications ─────────────────────────────────────    │
│  ├── id (UUID, PK)                                                  │
│  ├── user_id (UUID, FK → auth_users)                                │
│  ├── type (TEXT: nuevo_prospecto|prospecto_asignado|requiere...)    │
│  ├── title (TEXT)                                                   │
│  ├── message (TEXT)                                                 │
│  ├── metadata (JSONB: prospecto_id, nombre, motivo, etc.)           │
│  ├── is_read (BOOLEAN, default false)                               │
│  ├── created_at (TIMESTAMPTZ)                                       │
│  └── expires_at (TIMESTAMPTZ, default +7 días)                      │
│                                                                     │
│  TABLA: auth_users (MIGRADA desde SystemUI)                         │
│  ├── id (UUID)                                                      │
│  ├── full_name, email, is_active                                    │
│  └── role_id → auth_roles                                           │
│                                                                     │
│  TABLA: auth_user_coordinaciones                                    │
│  ├── user_id (FK → auth_users)                                      │
│  └── coordinacion_id (FK → coordinaciones)                          │
│                                                                     │
│  TABLA: auth_roles                                                  │
│  └── id, name (coordinador, supervisor, ejecutivo, etc.)            │
│                                                                     │
│  TABLA: coordinaciones                                              │
│  └── id, nombre                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Ventajas de la Arquitectura v2.0

| Aspecto | v1.0 (Frontend) | v2.0 (Trigger BD) |
|---------|-----------------|-------------------|
| Duplicados | ❌ Posibles si múltiples clientes conectados | ✅ Imposibles (un solo trigger) |
| Cross-database | ❌ Requería queries a SystemUI | ✅ Todo en PQNC_AI |
| Latencia | ⚠️ Frontend procesa → inserta | ✅ Trigger instantáneo |
| Mantenibilidad | ❌ Código en frontend + backend | ✅ Solo un trigger |
| Fiabilidad | ⚠️ Depende del estado del cliente | ✅ Ejecuta siempre que hay evento |

---

## Flujo de Datos

### 1. Generación de Notificación (Trigger de BD)

```
Usuario/Sistema modifica tabla prospectos
    │
    ▼
Trigger trigger_notify_prospecto_changes se dispara
    │
    ▼
Función fn_notify_prospecto_changes() evalúa:
    │
    ├──► INSERT + coordinacion_id + !ejecutivo_id
    │        → Loop: INSERT en user_notifications para cada coordinador/supervisor
    │
    ├──► UPDATE ejecutivo_id (null → valor)
    │        → INSERT en user_notifications para el ejecutivo
    │
    └──► UPDATE requiere_atencion_humana (false → true)
             → INSERT en user_notifications para ejecutivo o coordinadores
    │
    ▼
Supabase Realtime detecta INSERT en user_notifications
    │
    ▼
WebSocket envía payload al frontend
    │
    ▼
subscribeToUserNotifications callback
    │
    ▼
notificationStore.addNotification()
    │
    ├──► Agrega a notifications[]
    ├──► Incrementa unreadCount
    ├──► playNotificationSound()
    └──► showToastNotification()
```

### 2. Carga Inicial (Usuario inicia sesión)

```
Usuario inicia sesión
    │
    ▼
AuthContext proporciona user.id
    │
    ▼
NotificationSystem se monta
    │
    ├──► loadNotifications() → notificationsClient
    │                           .from('user_notifications')
    │                           .select('*')
    │                           .eq('user_id', userId)
    │                           .eq('is_read', false)
    │
    └──► subscribeToUserNotifications() → analysisSupabase
                                            .channel('user_notifications_${userId}_${timestamp}')
                                            .on('postgres_changes', { event: 'INSERT' })
```

### 3. Usuario hace clic en notificación

```
Usuario hace clic
    │
    ▼
handleNotificationClick()
    │
    ├──► localStorage.set('livechat-prospect-id', prospectoId)
    │
    ├──► window.dispatchEvent('navigate-to-livechat')
    │
    └──► markAsReadAndDelete() → DELETE de user_notifications
```

---

## Componentes Frontend

### Archivos Principales

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `NotificationSystem.tsx` | `src/components/notifications/` | Componente principal: Bell, Dropdown, Toast |
| `notificationStore.ts` | `src/stores/` | Store Zustand para estado global |
| `notificationsService.ts` | `src/services/` | Servicio simplificado (solo lectura + realtime) |
| `notification.mp3` | `public/sounds/` | Audio de alerta |
| `useProspectosNotifications.ts` | `src/hooks/` | **DEPRECADO** - No usar |

### NotificationSystem.tsx

```tsx
export const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  onNavigateToProspecto 
}) => {
  // ARQUITECTURA v2 (2026-01-15):
  // Las notificaciones son generadas por un trigger de base de datos
  // (fn_notify_prospecto_changes) que se ejecuta en INSERT/UPDATE de prospectos.
  // Esto elimina duplicados causados por múltiples clientes frontend conectados.
  // El frontend solo escucha via Realtime y muestra las notificaciones.
  
  return (
    <>
      <div className="relative">
        <NotificationBell />           {/* Campanita con contador */}
        <NotificationDropdown />       {/* Lista + botón Limpiar */}
      </div>
      <NotificationToast />            {/* Alerta flotante */}
    </>
  );
};
```

### notificationStore.ts (Zustand)

```typescript
interface NotificationState {
  notifications: UserNotification[];
  unreadCount: number;
  isDropdownOpen: boolean;
  toastNotification: UserNotification | null;
  showToast: boolean;
  isLoading: boolean;
  isSubscribed: boolean;
  
  // Actions
  loadNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: UserNotification) => void;
  markAsReadAndDelete: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;  // Botón Limpiar
  toggleDropdown: () => void;
  closeDropdown: () => void;
  hideToast: () => void;
  setSubscribed: (value: boolean) => void;
  clearAll: () => void;
}
```

---

## Backend y Base de Datos

### Base de Datos Unificada: PQNC_AI

> **IMPORTANTE**: Desde 2026-01-13, todo está en PQNC_AI. SystemUI está deprecado.

| Tabla | Descripción |
|-------|-------------|
| `prospectos` | Tabla principal - genera eventos para notificaciones |
| `user_notifications` | Almacena notificaciones pendientes |
| `auth_users` | Usuarios del sistema (migrada desde SystemUI) |
| `auth_roles` | Roles (coordinador, supervisor, ejecutivo, etc.) |
| `auth_user_coordinaciones` | Relación usuario ↔ coordinación |
| `coordinaciones` | Catálogo de coordinaciones |

### Esquema de user_notifications

```sql
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('nuevo_prospecto', 'prospecto_asignado', 'mensaje_nuevo', 'requiere_atencion')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    clicked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Realtime habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- RLS deshabilitado para acceso directo
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;
```

---

## Trigger Unificado

### fn_notify_prospecto_changes()

```sql
CREATE OR REPLACE FUNCTION fn_notify_prospecto_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_prospecto_nombre TEXT;
  v_coordinacion_nombre TEXT;
BEGIN
  -- Obtener nombre del prospecto
  v_prospecto_nombre := COALESCE(NEW.nombre_completo, NEW.nombre_whatsapp, 'Nuevo prospecto');
  
  -- Obtener nombre de coordinación si existe
  IF NEW.coordinacion_id IS NOT NULL THEN
    SELECT nombre INTO v_coordinacion_nombre 
    FROM coordinaciones 
    WHERE id = NEW.coordinacion_id;
  END IF;
  
  -- ========================================
  -- CASO 1: NUEVO PROSPECTO (INSERT)
  -- Notificar a coordinadores de la coordinación
  -- ========================================
  IF TG_OP = 'INSERT' AND NEW.coordinacion_id IS NOT NULL AND NEW.ejecutivo_id IS NULL THEN
    FOR v_user_id IN 
      SELECT DISTINCT u.id
      FROM auth_users u
      INNER JOIN auth_roles r ON u.role_id = r.id
      INNER JOIN auth_user_coordinaciones uc ON u.id = uc.user_id
      WHERE uc.coordinacion_id = NEW.coordinacion_id
        AND u.is_active = true
        AND r.name IN ('coordinador', 'supervisor')
    LOOP
      INSERT INTO user_notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (v_user_id, 'nuevo_prospecto', 'Nuevo prospecto en tu coordinacion', ...);
    END LOOP;
    
  -- ========================================
  -- CASO 2: ASIGNACIÓN DE EJECUTIVO (UPDATE)
  -- ========================================
  ELSIF TG_OP = 'UPDATE' AND OLD.ejecutivo_id IS NULL AND NEW.ejecutivo_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM auth_users u INNER JOIN auth_roles r ON u.role_id = r.id
               WHERE u.id = NEW.ejecutivo_id AND u.is_active = true
               AND r.name IN ('ejecutivo', 'coordinador')) THEN
      INSERT INTO user_notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (NEW.ejecutivo_id, 'prospecto_asignado', 'Prospecto asignado', ...);
    END IF;
    
  -- ========================================
  -- CASO 3: REQUIERE ATENCIÓN HUMANA (UPDATE)
  -- ========================================
  ELSIF TG_OP = 'UPDATE' 
    AND (OLD.requiere_atencion_humana IS NULL OR OLD.requiere_atencion_humana = false) 
    AND NEW.requiere_atencion_humana = true THEN
    
    IF NEW.ejecutivo_id IS NOT NULL THEN
      -- Notificar al ejecutivo
      INSERT INTO user_notifications (...);
    ELSIF NEW.coordinacion_id IS NOT NULL THEN
      -- Notificar a coordinadores
      FOR v_user_id IN SELECT ... LOOP
        INSERT INTO user_notifications (...);
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger

```sql
CREATE TRIGGER trigger_notify_prospecto_changes
AFTER INSERT OR UPDATE OF ejecutivo_id, requiere_atencion_humana
ON prospectos
FOR EACH ROW
EXECUTE FUNCTION fn_notify_prospecto_changes();
```

---

## Tipos de Notificaciones

| Tipo | Icono | Color | Cuándo se genera |
|------|-------|-------|------------------|
| `nuevo_prospecto` | MessageSquare | Indigo/Purple | INSERT: prospecto con coordinación sin ejecutivo |
| `prospecto_asignado` | UserPlus | Green/Emerald | UPDATE: ejecutivo_id de NULL a valor |
| `requiere_atencion` | AlertTriangle | Red/Orange | UPDATE: requiere_atencion_humana de false a true |

### Estructura del Metadata

```typescript
interface NotificationMetadata {
  prospecto_id: string;           // UUID del prospecto
  prospecto_nombre: string;       // Nombre para mostrar
  coordinacion_id?: string;       // UUID de la coordinación
  coordinacion_nombre?: string;   // Nombre de la coordinación
  telefono?: string;              // WhatsApp del prospecto
  motivo?: string;                // Motivo (solo en requiere_atencion)
  action_url: string;             // URL para navegar
}
```

---

## Troubleshooting

### Las notificaciones no llegan en realtime

1. **Verificar canal de realtime:**
   ```javascript
   // En consola del navegador
   // Buscar: "🔔 [Realtime] Suscribiendo a notificaciones:"
   // Verificar estado: "SUBSCRIBED"
   ```

2. **Verificar RLS deshabilitado:**
   ```sql
   SELECT relrowsecurity FROM pg_class WHERE relname = 'user_notifications';
   -- Debe retornar: false
   ```

3. **Verificar que la tabla está en realtime:**
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   -- Debe incluir 'user_notifications'
   ```

### El trigger no genera notificaciones

1. **Verificar que el trigger existe:**
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.prospectos'::regclass;
   -- Debe incluir: trigger_notify_prospecto_changes
   ```

2. **Verificar que la función existe:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'fn_notify_prospecto_changes';
   ```

3. **Probar manualmente:**
   ```sql
   -- Simular asignación de ejecutivo
   UPDATE prospectos 
   SET ejecutivo_id = 'UUID_DEL_EJECUTIVO'
   WHERE id = 'UUID_DEL_PROSPECTO' AND ejecutivo_id IS NULL;
   ```

### Audio no suena

- **Browser Autoplay Policy:** El audio requiere interacción previa del usuario
- El sistema intenta resumir el AudioContext al primer clic/keydown
- Verificar que existe: `/public/sounds/notification.mp3`

---

## Historial de Versiones

### v2.0.0 (2026-01-15)

**CAMBIO ARQUITECTÓNICO MAYOR: Trigger de BD**

- ✅ Nuevo trigger unificado `fn_notify_prospecto_changes`
- ✅ Eliminación de generación desde frontend (evita duplicados)
- ✅ Migración completa a PQNC_AI (sin dependencias de SystemUI)
- ✅ Limpieza de 528 notificaciones duplicadas
- ✅ Hook `useProspectosNotifications` deprecado
- ✅ Servicio simplificado (solo lectura + realtime)
- ✅ Documentación actualizada

### v1.0.0 (2026-01-13)

- Implementación inicial del sistema de notificaciones
- Campana con contador, dropdown y toast
- Triggers en BD para 3 tipos de eventos
- Sonido de notificación
- Documentación inicial

---

**Última actualización:** 15 de Enero 2026
**Autor:** Team PQNC
**Versión:** 2.0.0
