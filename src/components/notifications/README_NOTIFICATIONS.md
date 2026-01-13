# Sistema de Notificaciones - PQNC QA AI Platform

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo de Datos](#flujo-de-datos)
4. [Componentes Frontend](#componentes-frontend)
5. [Backend y Base de Datos](#backend-y-base-de-datos)
6. [Triggers Automáticos](#triggers-automáticos)
7. [Tipos de Notificaciones](#tipos-de-notificaciones)
8. [Troubleshooting](#troubleshooting)
9. [Historial de Problemas Resueltos](#historial-de-problemas-resueltos)

---

## Resumen Ejecutivo

El sistema de notificaciones proporciona alertas en tiempo real estilo "redes sociales" para coordinadores, supervisores y ejecutivos. Las notificaciones aparecen como:

1. **Bell Icon**: Campanita con contador de no leídas
2. **Dropdown**: Lista desplegable de notificaciones pendientes
3. **Toast**: Notificación flotante desde la derecha con animación y sonido
4. **Realtime**: Actualizaciones instantáneas via Supabase Realtime

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  NotificationSystem.tsx                                             │
│  ├── NotificationBell (campanita + contador)                        │
│  ├── NotificationDropdown (lista de notificaciones)                 │
│  └── NotificationToast (alerta flotante)                            │
│                                                                     │
│  notificationStore.ts (Zustand)                                     │
│  ├── notifications[]                                                │
│  ├── unreadCount                                                    │
│  ├── toastNotification                                              │
│  └── playNotificationSound()                                        │
│                                                                     │
│  notificationsService.ts                                            │
│  ├── getUnreadNotifications()                                       │
│  ├── markAsReadAndDelete()                                          │
│  ├── markAllAsRead()                                                │
│  └── subscribeToUserNotifications() ← REALTIME                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Realtime (WebSocket)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE - PQNC_AI                               │
│                (glsmifhkoaifvaegsozd.supabase.co)                   │
├─────────────────────────────────────────────────────────────────────┤
│  TABLA: user_notifications                                          │
│  ├── id (UUID, PK)                                                  │
│  ├── user_id (UUID, FK → auth_users en SystemUI)                    │
│  ├── type (TEXT: nuevo_prospecto|prospecto_asignado|requiere...)    │
│  ├── title (TEXT)                                                   │
│  ├── message (TEXT)                                                 │
│  ├── metadata (JSONB: prospecto_id, nombre, motivo, etc.)           │
│  ├── is_read (BOOLEAN, default false)                               │
│  ├── clicked (BOOLEAN, default false)                               │
│  ├── created_at (TIMESTAMPTZ)                                       │
│  ├── read_at (TIMESTAMPTZ, nullable)                                │
│  └── expires_at (TIMESTAMPTZ, default +7 días)                      │
│                                                                     │
│  TRIGGERS en tabla 'prospectos':                                    │
│  ├── trigger_notify_new_prospecto (INSERT)                          │
│  ├── trigger_notify_ejecutivo_assigned (UPDATE ejecutivo_id)        │
│  └── trigger_notify_requiere_atencion (UPDATE requiere_atencion...) │
│                                                                     │
│  FUNCIONES:                                                         │
│  ├── notify_new_prospecto_to_coordinacion()                         │
│  ├── notify_ejecutivo_assigned()                                    │
│  └── notify_requiere_atencion_humana()                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ FK user_id
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE - SystemUI                              │
│                (zbylezfyagwrxoecioup.supabase.co)                   │
├─────────────────────────────────────────────────────────────────────┤
│  TABLA: auth_users                                                  │
│  ├── id (UUID) ← user_id de notificaciones                         │
│  ├── email                                                          │
│  ├── full_name                                                      │
│  ├── role_name (ejecutivo, coordinador, supervisor, etc.)           │
│  └── is_active                                                      │
│                                                                     │
│  TABLA: auth_user_coordinaciones                                    │
│  ├── user_id (FK → auth_users)                                      │
│  └── coordinacion_id (UUID)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

### 1. Carga Inicial
```
Usuario inicia sesión
    │
    ▼
AuthContext proporciona user.id
    │
    ▼
NotificationSystem se monta
    │
    ├──► fetchNotifications() → analysisSupabase.from('user_notifications')
    │                              .select('*')
    │                              .eq('user_id', userId)
    │                              .eq('is_read', false)
    │
    └──► subscribeToUserNotifications() → analysisSupabase
                                            .channel('user_notifications_${userId}_${timestamp}')
                                            .on('postgres_changes', { event: 'INSERT' })
```

### 2. Nueva Notificación (Realtime)
```
Trigger se dispara en tabla 'prospectos'
    │
    ▼
Función PL/pgSQL inserta en 'user_notifications'
    │
    ▼
Supabase Realtime detecta INSERT
    │
    ▼
WebSocket envía payload al frontend
    │
    ▼
notificationsService.subscribeToUserNotifications callback
    │
    ▼
notificationStore.addNotification()
    │
    ├──► Agrega a notifications[]
    ├──► Incrementa unreadCount
    ├──► playNotificationSound()
    └──► showToastNotification()
```

### 3. Usuario hace clic en notificación
```
Usuario hace clic
    │
    ▼
handleNotificationClick()
    │
    ├──► onNavigate(prospecto_id) → Navega a LiveChat
    │
    └──► markAsReadAndDelete() → DELETE de user_notifications
```

---

## Componentes Frontend

### Archivos Principales

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `NotificationSystem.tsx` | `src/components/notifications/` | Componente principal que agrupa Bell, Dropdown y Toast |
| `notificationStore.ts` | `src/stores/` | Store Zustand para estado global de notificaciones |
| `notificationsService.ts` | `src/services/` | Servicio para interactuar con Supabase |
| `notification.mp3` | `public/sounds/` | Audio de alerta |

### NotificationSystem.tsx

Exporta un único componente `<NotificationSystem />` que internamente contiene:

```tsx
<div className="relative">
  <NotificationBell />           {/* Campanita con contador */}
  <NotificationDropdown />       {/* Lista desplegable */}
  <NotificationToast />          {/* Alerta flotante */}
</div>
```

**Props:**
- `onNavigateToProspecto: (prospectoId: string) => void` - Callback para navegar al LiveChat

### notificationStore.ts (Zustand)

```typescript
interface NotificationState {
  notifications: UserNotification[];
  unreadCount: number;
  isDropdownOpen: boolean;
  toastNotification: UserNotification | null;
  showToast: boolean;
  isLoading: boolean;
  
  // Actions
  setNotifications: (notifications: UserNotification[]) => void;
  addNotification: (notification: UserNotification) => void;
  markAsReadAndDelete: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  showToastNotification: (notification: UserNotification) => void;
  hideToast: () => void;
}
```

---

## Backend y Base de Datos

### Conexiones a Supabase

| Cliente | Proyecto | URL | Uso |
|---------|----------|-----|-----|
| `analysisSupabase` | PQNC_AI | glsmifhkoaifvaegsozd.supabase.co | Lectura/escritura de `user_notifications`, Realtime |
| `supabaseSystemUI` | SystemUI | zbylezfyagwrxoecioup.supabase.co | Consulta de `auth_users` para roles |

### ⚠️ IMPORTANTE: Base de Datos Correcta

**La tabla `user_notifications` está en PQNC_AI, NO en SystemUI.**

Esto es crítico porque:
1. Los triggers están en la tabla `prospectos` de PQNC_AI
2. Realtime está habilitado en PQNC_AI para esta tabla
3. RLS está DESHABILITADO en la tabla para permitir acceso directo

### Esquema de la Tabla

```sql
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- FK lógico a auth_users en SystemUI
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

## Triggers Automáticos

### 1. Nuevo Prospecto → Coordinadores

**Trigger:** `trigger_notify_new_prospecto`
**Evento:** `AFTER INSERT ON prospectos`
**Condición:** `coordinacion_id IS NOT NULL AND ejecutivo_id IS NULL`

```sql
CREATE OR REPLACE FUNCTION notify_new_prospecto_to_coordinacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coordinacion_id IS NOT NULL AND NEW.ejecutivo_id IS NULL THEN
        -- Notifica a coordinadores y supervisores de la coordinación
        INSERT INTO user_notifications (user_id, type, title, message, metadata)
        SELECT au.id, 'nuevo_prospecto', 'Nuevo prospecto en tu coordinacion', ...
        FROM auth_users au
        JOIN auth_user_coordinaciones auc ON au.id = auc.user_id
        WHERE auc.coordinacion_id = NEW.coordinacion_id
          AND au.role_name IN ('coordinador', 'supervisor');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Ejecutivo Asignado → Ejecutivo

**Trigger:** `trigger_notify_ejecutivo_assigned`
**Evento:** `AFTER UPDATE OF ejecutivo_id ON prospectos`
**Condición:** `ejecutivo_id cambió de NULL a un valor`

```sql
CREATE OR REPLACE FUNCTION notify_ejecutivo_assigned()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ejecutivo_id IS NOT NULL 
       AND (OLD.ejecutivo_id IS NULL OR OLD.ejecutivo_id != NEW.ejecutivo_id) THEN
        -- Notifica al ejecutivo asignado
        INSERT INTO user_notifications (user_id, type, title, message, metadata)
        VALUES (NEW.ejecutivo_id, 'prospecto_asignado', 'Prospecto asignado', ...);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Requiere Atención Humana → Ejecutivo o Coordinadores

**Trigger:** `trigger_notify_requiere_atencion`
**Evento:** `AFTER UPDATE OF requiere_atencion_humana ON prospectos`
**Condición:** `requiere_atencion_humana cambió de false/null a true`

```sql
CREATE OR REPLACE FUNCTION notify_requiere_atencion_humana()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.requiere_atencion_humana = true 
       AND (OLD.requiere_atencion_humana IS NULL OR OLD.requiere_atencion_humana = false) THEN
        
        IF NEW.ejecutivo_id IS NOT NULL THEN
            -- Notifica al ejecutivo
            INSERT INTO user_notifications (...) VALUES (NEW.ejecutivo_id, 'requiere_atencion', ...);
        ELSIF NEW.coordinacion_id IS NOT NULL THEN
            -- Notifica a coordinadores de la coordinación
            INSERT INTO user_notifications (...)
            SELECT au.id, 'requiere_atencion', ...
            FROM auth_users au
            JOIN auth_user_coordinaciones auc ON au.id = auc.user_id
            WHERE auc.coordinacion_id = NEW.coordinacion_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Tipos de Notificaciones

| Tipo | Icono | Color | Cuándo se genera |
|------|-------|-------|------------------|
| `nuevo_prospecto` | MessageSquare | Indigo/Purple | Nuevo prospecto llega a coordinación sin ejecutivo |
| `prospecto_asignado` | UserPlus | Green/Emerald | Se asigna ejecutivo a un prospecto |
| `requiere_atencion` | AlertTriangle | Red/Orange | Se activa flag `requiere_atencion_humana` |
| `mensaje_nuevo` | MessageSquare | Indigo/Purple | (Reservado para futuro uso) |

### Estructura del Metadata

```typescript
interface NotificationMetadata {
  prospecto_id: string;      // UUID del prospecto
  prospecto_nombre: string;  // Nombre para mostrar
  coordinacion_id?: string;  // UUID de la coordinación
  telefono?: string;         // WhatsApp del prospecto
  motivo?: string;           // Motivo de atención humana (solo en requiere_atencion)
  action_url: string;        // URL para navegar al hacer clic
}
```

---

## Troubleshooting

### Las notificaciones no aparecen

1. **Verificar conexión a la BD correcta:**
   - Las notificaciones están en PQNC_AI (`glsmifhkoaifvaegsozd`)
   - NO en SystemUI

2. **Verificar RLS:**
   ```sql
   -- Debe estar deshabilitado
   SELECT relrowsecurity FROM pg_class WHERE relname = 'user_notifications';
   -- Debe retornar: false
   ```

3. **Verificar Realtime habilitado:**
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   -- Debe incluir 'user_notifications'
   ```

### Realtime no funciona

1. **Verificar que el canal se suscribe correctamente:**
   - El canal debe usar `analysisSupabase` (PQNC_AI)
   - El nombre del canal debe ser único (incluye timestamp)

2. **Verificar user_id correcto:**
   - El filtro del canal usa `user_id=eq.${userId}`
   - Verificar que el userId del AuthContext coincide con los registros

### Audio no suena

1. **Browser Autoplay Policy:**
   - El audio requiere interacción previa del usuario
   - El sistema intenta resumir el AudioContext al primer clic/keydown

2. **Archivo de audio:**
   - Debe existir `/public/sounds/notification.mp3`

---

## Historial de Problemas Resueltos

### Problema 1: Base de Datos Incorrecta

**Síntoma:** Notificaciones insertadas pero no aparecían en UI
**Causa:** El servicio buscaba en SystemUI pero la tabla real está en PQNC_AI
**Solución:** Cambiar `supabaseSystemUI` por `analysisSupabase` en el servicio

### Problema 2: RLS Bloqueando Acceso

**Síntoma:** Error 400 "permission denied" o arrays vacíos
**Causa:** RLS habilitado bloqueaba al anon_key
**Solución:** Deshabilitar RLS en la tabla `user_notifications`

### Problema 3: PostgREST Cache Desactualizado

**Síntoma:** Error "column does not exist" aunque la columna existía
**Causa:** PostgREST no había recargado el schema
**Solución:** Ejecutar `NOTIFY pgrst, 'reload schema';`

### Problema 4: Realtime con Cliente Incorrecto

**Síntoma:** `CHANNEL_ERROR` en consola
**Causa:** Suscripción realtime usando cliente de SystemUI
**Solución:** Usar `analysisSupabase` para la suscripción realtime

### Problema 5: user_id Incorrecto

**Síntoma:** Notificaciones no llegaban a usuario específico
**Causa:** El user_id insertado no coincidía con el del AuthContext
**Solución:** Verificar user_id desde consola y usar el correcto

---

## Dependencias

### NPM Packages
- `@supabase/supabase-js` - Cliente Supabase
- `zustand` - State management
- `framer-motion` - Animaciones
- `lucide-react` - Iconos

### Archivos de Configuración
- `src/config/analysisSupabase.ts` - Cliente PQNC_AI
- `src/config/supabaseSystemUI.ts` - Cliente SystemUI
- `src/contexts/AuthContext.tsx` - Contexto de autenticación

### Variables de Entorno
```env
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=...
VITE_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## Changelog

### v1.0.0 (2026-01-13)
- Implementación inicial del sistema de notificaciones
- Campana con contador, dropdown y toast
- Triggers automáticos para 3 tipos de eventos
- Sonido de notificación
- Documentación completa

---

**Última actualización:** 13 de Enero 2026
**Autor:** Team PQNC
**Versión:** 1.0.0
