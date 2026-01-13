# 🔔 Sistema de Notificaciones Completo - Documentación Final

**Fecha de Documentación:** 13 de Enero 2026  
**Versión del Sistema:** v2.2.50  
**Estado:** ✅ Producción - Migrado a PQNC_AI Unificado

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Migración a Base de Datos Unificada](#migración-a-base-de-datos-unificada)
4. [Estructura de Base de Datos](#estructura-de-base-de-datos)
5. [Servicios y Componentes](#servicios-y-componentes)
6. [Flujo de Trabajo](#flujo-de-trabajo)
7. [Suscripciones Realtime](#suscripciones-realtime)
8. [Tipos de Notificaciones](#tipos-de-notificaciones)
9. [Configuración y Setup](#configuración-y-setup)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen Ejecutivo

El sistema de notificaciones proporciona alertas en tiempo real para usuarios autenticados sobre:
- **Nuevos mensajes en Live Chat** (mensajes_whatsapp)
- **Nuevas llamadas en Live Monitor** (llamadas_ventas)

### Características Principales

✅ **Notificaciones Individuales por Usuario**: Cada usuario ve solo sus notificaciones  
✅ **Realtime**: Actualizaciones instantáneas vía Supabase Realtime  
✅ **Auto-reset**: Se marcan como leídas automáticamente al ingresar al módulo  
✅ **Sonido de Notificación**: Audio tipo WhatsApp al recibir nuevas alertas  
✅ **Silenciar Notificaciones**: Botón para desactivar sonidos  
✅ **Base de Datos Unificada**: Todo en PQNC_AI (migración completada)

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Header.tsx                                                         │
│  └── NotificationBell.tsx                                          │
│      ├── Contador de no leídas                                     │
│      ├── Dropdown con lista                                        │
│      └── Sonido de notificación                                    │
│                                                                     │
│  MainApp.tsx                                                        │
│  └── NotificationListener.tsx (Global)                            │
│      ├── Escucha mensajes_whatsapp                                 │
│      └── Escucha llamadas_ventas                                   │
│                                                                     │
│  LiveChatModule.tsx                                                 │
│  └── useNotifications({ currentModule: 'live-chat' })            │
│      └── Marca notificaciones como leídas al entrar               │
│                                                                     │
│  LiveMonitorKanban.tsx                                              │
│  └── useNotifications({ currentModule: 'live-monitor' })         │
│      └── Marca notificaciones como leídas al entrar               │
├─────────────────────────────────────────────────────────────────────┤
│                         SERVICIOS                                   │
├─────────────────────────────────────────────────────────────────────┤
│  userNotificationService.ts                                         │
│  ├── getUnreadCount()                                              │
│  ├── markAsRead()                                                  │
│  ├── markAllAsRead()                                               │
│  └── subscribeToNotifications()                                    │
│                                                                     │
│  notificationService.ts                                              │
│  ├── createNotification()                                           │
│  ├── getNotifications()                                            │
│  └── subscribeToNewMessages/Calls()                                │
├─────────────────────────────────────────────────────────────────────┤
│                         BASE DE DATOS                               │
├─────────────────────────────────────────────────────────────────────┤
│  PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)                        │
│  └── user_notifications                                             │
│      ├── Realtime habilitado                                       │
│      ├── Índices optimizados                                       │
│      └── RLS configurado                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Cliente Supabase Utilizado

**ANTES (Legacy):**
- `supabaseSystemUI` → System_UI (zbylezfyagwrxoecioup)
- Base de datos separada para notificaciones

**AHORA (Actual):**
- `pqncSupabase` → PQNC_AI (glsmifhkoaifvaegsozd)
- Base de datos unificada (todo en una sola BD)

---

## 🔄 Migración a Base de Datos Unificada

### Cambios Realizados

#### 1. Actualización de Tabla `user_notifications`

**Script SQL Ejecutado:**
```sql
-- Agregar columnas necesarias
ALTER TABLE user_notifications 
ADD COLUMN notification_type VARCHAR(50) CHECK (notification_type IN ('new_message', 'new_call'));

ALTER TABLE user_notifications 
ADD COLUMN module VARCHAR(50) CHECK (module IN ('live-chat', 'live-monitor'));

-- Columnas para mensajes
ALTER TABLE user_notifications ADD COLUMN message_id UUID;
ALTER TABLE user_notifications ADD COLUMN conversation_id UUID;
ALTER TABLE user_notifications ADD COLUMN customer_name VARCHAR(255);
ALTER TABLE user_notifications ADD COLUMN customer_phone VARCHAR(50);
ALTER TABLE user_notifications ADD COLUMN message_preview TEXT;

-- Columnas para llamadas
ALTER TABLE user_notifications ADD COLUMN call_id VARCHAR(255);
ALTER TABLE user_notifications ADD COLUMN call_status VARCHAR(50);
ALTER TABLE user_notifications ADD COLUMN prospect_id UUID;

-- Columna para silenciar
ALTER TABLE user_notifications ADD COLUMN is_muted BOOLEAN DEFAULT false;

-- Índices para optimización
CREATE INDEX idx_user_notifications_notification_type ON user_notifications(notification_type);
CREATE INDEX idx_user_notifications_module ON user_notifications(module);
CREATE INDEX idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = false;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

#### 2. Actualización de Servicios

**Archivos Modificados:**
- `src/services/userNotificationService.ts`
- `src/services/notificationService.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationListener.tsx`

**Cambio Principal:**
```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// AHORA
import { pqncSupabase } from '../config/pqncSupabase';
```

#### 3. Validaciones Agregadas

Todos los servicios ahora verifican que `pqncSupabase` esté configurado:

```typescript
if (!pqncSupabase) {
  console.warn('⚠️ pqncSupabase no está configurado');
  return defaultValue;
}
```

---

## 🗄️ Estructura de Base de Datos

### Tabla: `user_notifications`

**Ubicación:** PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)

#### Columnas

| Columna | Tipo | Descripción | Nullable |
|---------|------|-------------|----------|
| `id` | UUID | Identificador único | NO (PK) |
| `user_id` | UUID | ID del usuario autenticado | NO |
| `notification_type` | VARCHAR(50) | Tipo: 'new_message' o 'new_call' | NO |
| `module` | VARCHAR(50) | Módulo: 'live-chat' o 'live-monitor' | NO |
| `message_id` | UUID | ID del mensaje (si es new_message) | SÍ |
| `conversation_id` | UUID | ID de la conversación | SÍ |
| `prospect_id` | UUID | ID del prospecto/cliente | SÍ |
| `customer_name` | VARCHAR(255) | Nombre del cliente | SÍ |
| `customer_phone` | VARCHAR(50) | Teléfono del cliente | SÍ |
| `message_preview` | TEXT | Vista previa del mensaje | SÍ |
| `call_id` | VARCHAR(255) | ID de la llamada (si es new_call) | SÍ |
| `call_status` | VARCHAR(50) | Estado de la llamada | SÍ |
| `is_read` | BOOLEAN | Si está leída | NO (default: false) |
| `read_at` | TIMESTAMP | Fecha de lectura | SÍ |
| `is_muted` | BOOLEAN | Si está silenciada | NO (default: false) |
| `created_at` | TIMESTAMP | Fecha de creación | NO |
| `expires_at` | TIMESTAMP | Fecha de expiración | SÍ |

#### Índices

```sql
-- Índices para optimización
CREATE INDEX idx_user_notifications_notification_type ON user_notifications(notification_type);
CREATE INDEX idx_user_notifications_module ON user_notifications(module);
CREATE INDEX idx_user_notifications_message_id ON user_notifications(message_id);
CREATE INDEX idx_user_notifications_call_id ON user_notifications(call_id);
CREATE INDEX idx_user_notifications_prospect_id ON user_notifications(prospect_id);
CREATE INDEX idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = false;
```

#### Realtime

✅ **Habilitado**: La tabla está incluida en la publicación `supabase_realtime`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

---

## 🔧 Servicios y Componentes

### 1. `userNotificationService.ts`

**Ubicación:** `src/services/userNotificationService.ts`

**Cliente:** `pqncSupabase`

**Funciones Principales:**

```typescript
// Inicializar con usuario
setUserId(userId: string): void

// Obtener contador de no leídas
getUnreadCount(): Promise<NotificationCounts>
// Retorna: { total, unread, activeCalls, newMessages }

// Marcar como leída
markAsRead(notificationId: string): Promise<boolean>

// Marcar todas como leídas (opcional por módulo)
markAllAsRead(type?: 'new_message' | 'new_call'): Promise<boolean>

// Marcar notificaciones de mensaje como leídas
markMessageNotificationsAsRead(conversationId: string): Promise<boolean>

// Marcar notificaciones de llamada como leídas
markCallNotificationsAsRead(callId: string): Promise<boolean>

// Silenciar/Activar notificaciones
toggleMute(notificationId: string, isMuted: boolean): Promise<boolean>

// Obtener estado de mute
getMuteStatus(): Promise<boolean>

// Suscribirse a cambios en tiempo real
subscribeToNotifications(
  onNotification: (notification: UserNotification) => void,
  onCountChange?: (counts: NotificationCounts) => void
): () => void
```

### 2. `notificationService.ts`

**Ubicación:** `src/services/notificationService.ts`

**Cliente:** `pqncSupabase` (para user_notifications)  
**Cliente:** `analysisSupabase` (para escuchar mensajes/llamadas)

**Funciones Principales:**

```typescript
// Crear notificación
createNotification(notification: Omit<UserNotification, 'id' | 'created_at' | 'is_read' | 'read_at'>): Promise<string | null>

// Obtener notificaciones del usuario
getNotifications(limit?: number): Promise<UserNotification[]>

// Obtener contador
getUnreadCount(): Promise<NotificationCounts>

// Marcar como leída
markAsRead(notificationId: string): Promise<boolean>

// Marcar todas como leídas
markAllAsRead(module?: 'live-chat' | 'live-monitor'): Promise<boolean>
```

### 3. `NotificationBell.tsx`

**Ubicación:** `src/components/notifications/NotificationBell.tsx`

**Características:**
- Badge con contador de no leídas
- Dropdown con lista de notificaciones
- Sonido de notificación tipo WhatsApp
- Botón para silenciar/activar
- Navegación automática al hacer click

**Props:**
```typescript
interface NotificationBellProps {
  darkMode?: boolean;
}
```

**Integración:**
- Montado en `Header.tsx`
- Visible para todos los usuarios autenticados

### 4. `NotificationListener.tsx`

**Ubicación:** `src/components/notifications/NotificationListener.tsx`

**Características:**
- Componente global (montado en `MainApp.tsx`)
- Escucha nuevos mensajes en `mensajes_whatsapp`
- Escucha nuevas llamadas en `llamadas_ventas`
- Verifica permisos antes de crear notificaciones
- Crea notificaciones automáticamente

**Flujo:**
1. Detecta nuevo mensaje/llamada
2. Verifica permisos del usuario
3. Crea notificación en `user_notifications`
4. Realtime propaga el cambio
5. `NotificationBell` actualiza el contador

### 5. `useNotifications.ts` Hook

**Ubicación:** `src/hooks/useNotifications.ts`

**Uso:**
```typescript
// En LiveChatModule.tsx
useNotifications({ currentModule: 'live-chat' });

// En LiveMonitorKanban.tsx
useNotifications({ currentModule: 'live-monitor' });
```

**Funcionalidad:**
- Inicializa el servicio con el usuario actual
- Marca notificaciones como leídas al entrar al módulo
- Limpia suscripciones al desmontar

---

## 🔄 Flujo de Trabajo

### Flujo de Notificación de Mensaje

```
1. Usuario envía mensaje en WhatsApp
   ↓
2. Mensaje se inserta en mensajes_whatsapp (analysisSupabase)
   ↓
3. NotificationListener detecta INSERT via Realtime
   ↓
4. Verifica permisos del usuario actual
   ↓
5. Si tiene acceso, crea notificación en user_notifications (pqncSupabase)
   ↓
6. Realtime propaga cambio a todos los usuarios suscritos
   ↓
7. NotificationBell actualiza contador y muestra badge
   ↓
8. Usuario hace click en notificación
   ↓
9. Navega a Live Chat con el prospecto
   ↓
10. useNotifications marca notificaciones como leídas
```

### Flujo de Notificación de Llamada

```
1. Nueva llamada se inserta en llamadas_ventas (analysisSupabase)
   ↓
2. NotificationListener detecta INSERT via Realtime
   ↓
3. Verifica permisos del usuario actual
   ↓
4. Si tiene acceso, crea notificación en user_notifications (pqncSupabase)
   ↓
5. Realtime propaga cambio
   ↓
6. NotificationBell actualiza contador
   ↓
7. Usuario hace click → Navega a Live Monitor
   ↓
8. useNotifications marca notificaciones como leídas
```

---

## 📡 Suscripciones Realtime

### Canal de Notificaciones por Usuario

**Canal:** `user_notifications_{userId}`

**Eventos Escuchados:**
- `INSERT`: Nueva notificación creada
- `UPDATE`: Notificación marcada como leída

**Filtro:**
```typescript
filter: `user_id=eq.${userId}`
```

### Canal de Mensajes (Global)

**Canal:** `global_notifications_messages_{userId}`

**Tabla:** `mensajes_whatsapp`  
**Evento:** `INSERT`  
**Filtro:** Solo mensajes de prospectos (`rol === 'Prospecto'`)

### Canal de Llamadas (Global)

**Canal:** `global_notifications_calls_{userId}`

**Tabla:** `llamadas_ventas`  
**Evento:** `INSERT`  
**Filtro:** Solo llamadas activas (`call_status === 'activa'` o `'ringing'`)

---

## 📝 Tipos de Notificaciones

### 1. `new_message`

**Trigger:** Nuevo mensaje en Live Chat  
**Módulo:** `live-chat`  
**Datos Incluidos:**
- `message_id`: ID del mensaje
- `conversation_id`: ID de la conversación
- `prospect_id`: ID del prospecto
- `customer_name`: Nombre del cliente
- `customer_phone`: Teléfono del cliente
- `message_preview`: Vista previa del mensaje (100 caracteres)

**Icono:** 💬 MessageSquare

### 2. `new_call`

**Trigger:** Nueva llamada en Live Monitor  
**Módulo:** `live-monitor`  
**Datos Incluidos:**
- `call_id`: ID de la llamada
- `call_status`: Estado de la llamada
- `prospect_id`: ID del prospecto

**Icono:** 📞 Phone

---

## ⚙️ Configuración y Setup

### Variables de Entorno Requeridas

```env
# PQNC_AI (Base de datos unificada)
VITE_PQNC_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_PQNC_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_PQNC_SUPABASE_SERVICE_KEY=<tu_service_key>

# Analysis (para escuchar mensajes/llamadas)
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=<tu_anon_key>
```

### Verificación de Setup

1. **Verificar tabla existe:**
```sql
SELECT * FROM user_notifications LIMIT 1;
```

2. **Verificar Realtime habilitado:**
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_notifications';
```

3. **Verificar índices:**
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'user_notifications';
```

---

## 🔍 Troubleshooting

### Problema: Notificaciones no aparecen

**Causas Posibles:**
1. `pqncSupabase` no está configurado
2. Realtime no está habilitado
3. Permisos RLS bloqueando acceso
4. Usuario no tiene acceso al prospecto

**Solución:**
```typescript
// Verificar en consola del navegador
console.log('pqncSupabase:', pqncSupabase);
console.log('Usuario:', user?.id);

// Verificar suscripción
// Debe aparecer: "✅ Suscrito a notificaciones del usuario"
```

### Problema: Sonido no se reproduce

**Causa:** Browser Autoplay Policy

**Solución:**
- El sonido solo se reproduce después de un gesto del usuario (click/touch)
- El sistema inicializa AudioContext automáticamente en el primer click

### Problema: Notificaciones no se marcan como leídas

**Causa:** Hook `useNotifications` no está siendo llamado

**Solución:**
```typescript
// Asegurar que está en el componente del módulo
import { useNotifications } from '../../hooks/useNotifications';

// En el componente
useNotifications({ currentModule: 'live-chat' }); // o 'live-monitor'
```

### Problema: Contador no se actualiza

**Causa:** Suscripción Realtime no está activa

**Solución:**
```typescript
// Verificar en consola
// Debe aparecer: "✅ Suscrito a notificaciones del usuario"

// Verificar canal
const channel = pqncSupabase.channel('user_notifications_${userId}');
console.log('Canal estado:', channel.state);
```

---

## 📊 Métricas y Performance

### Optimizaciones Implementadas

1. **Índices en columnas frecuentemente consultadas:**
   - `user_id + is_read` (WHERE is_read = false)
   - `notification_type`
   - `module`

2. **Carga Lazy:**
   - Notificaciones se cargan solo cuando se abre el dropdown
   - Contador se actualiza cada 30 segundos como fallback

3. **Limpieza Automática:**
   - Suscripciones se limpian al desmontar componentes
   - Canales Realtime se desconectan correctamente

### Límites

- **Notificaciones por usuario:** Sin límite (limitado por `expires_at`)
- **Tiempo de expiración:** 7 días por defecto
- **Contador máximo:** Sin límite (muestra "99+" si > 99)

---

## 🔐 Seguridad

### Permisos y RLS

**Row Level Security:**
- Los usuarios solo pueden ver sus propias notificaciones
- Filtro automático por `user_id`

**Verificación de Acceso:**
- `NotificationListener` verifica permisos antes de crear notificaciones
- Solo usuarios con acceso al prospecto reciben notificaciones

### Validaciones

1. **Usuario autenticado:** Todas las funciones verifican `user?.id`
2. **Cliente configurado:** Validación de `pqncSupabase` antes de operaciones
3. **Permisos de prospecto:** Verificación antes de crear notificación

---

## 📚 Referencias

### Archivos Clave

- `src/services/userNotificationService.ts` - Servicio principal
- `src/services/notificationService.ts` - Servicio de creación
- `src/components/notifications/NotificationBell.tsx` - Componente UI
- `src/components/notifications/NotificationListener.tsx` - Listener global
- `src/hooks/useNotifications.ts` - Hook de integración

### Documentación Relacionada

- `docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md` - Migración completa
- `docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md` - Arquitectura unificada
- `src/components/notifications/README_NOTIFICATIONS.md` - README técnico

---

## ✅ Checklist de Verificación

- [x] Tabla `user_notifications` creada en PQNC_AI
- [x] Columnas necesarias agregadas
- [x] Índices creados
- [x] Realtime habilitado
- [x] Servicios migrados a `pqncSupabase`
- [x] Componentes actualizados
- [x] Validaciones agregadas
- [x] Permisos verificados
- [x] Documentación completa

---

**Última Actualización:** 13 de Enero 2026  
**Versión del Documento:** 1.0.0  
**Estado:** ✅ Completado y en Producción
