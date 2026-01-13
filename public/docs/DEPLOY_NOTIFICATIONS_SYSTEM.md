# 🔔 Sistema de Notificaciones - Guía de Despliegue

## 📋 Resumen

Sistema de notificaciones en tiempo real para usuarios autenticados que muestra:
- Nuevos mensajes en Live Chat
- Nuevas llamadas en Live Monitor

Las notificaciones aparecen en el header y se reinician automáticamente al ingresar a cada módulo.

---

## 🗄️ Paso 1: Crear Tabla en System UI

### Ejecutar SQL

Conéctate a la base de datos `system_ui` y ejecuta el script:

```bash
# Opción 1: Desde Supabase Dashboard
# Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql/new
# Copia y pega el contenido de: scripts/sql/create_user_notifications_table.sql

# Opción 2: Desde línea de comandos (si tienes acceso)
psql "postgresql://postgres:VsNJX$@&eU9*!g6d@db.zbylezfyagwrxoecioup.supabase.co:5432/postgres" -f scripts/sql/create_user_notifications_table.sql
```

### Verificar Creación

```sql
-- Verificar que la tabla existe
SELECT * FROM user_notifications LIMIT 1;

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'user_notifications';

-- Verificar que Realtime está habilitado
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications';
```

---

## ⚙️ Paso 2: Habilitar Realtime en Supabase

1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/database/replication
2. Busca la tabla `user_notifications`
3. Activa el toggle de **"Enable Realtime"**
4. Guarda los cambios

**O ejecuta este SQL:**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
```

---

## 🔧 Paso 3: Verificar Configuración

### Archivos Creados

1. ✅ `scripts/sql/create_user_notifications_table.sql` - Script de creación de tabla
2. ✅ `src/services/notificationService.ts` - Servicio de notificaciones
3. ✅ `src/components/notifications/NotificationBell.tsx` - Componente de campana
4. ✅ `src/components/notifications/NotificationListener.tsx` - Listener global
5. ✅ `src/hooks/useNotifications.ts` - Hook para módulos

### Archivos Modificados

1. ✅ `src/components/Header.tsx` - Integración de NotificationBell
2. ✅ `src/components/MainApp.tsx` - Integración de NotificationListener
3. ✅ `src/components/chat/LiveChatModule.tsx` - Hook para reiniciar notificaciones
4. ✅ `src/components/analysis/LiveMonitorKanban.tsx` - Hook para reiniciar notificaciones

---

## 🧪 Paso 4: Probar el Sistema

### Test 1: Notificaciones de Mensajes

1. Inicia sesión como usuario autenticado
2. Abre la consola del navegador
3. En otra pestaña o desde otro dispositivo, envía un mensaje de WhatsApp que llegue a `mensajes_whatsapp`
4. Deberías ver:
   - Badge rojo con número en la campana del header
   - Notificación apareciendo en el dropdown

### Test 2: Notificaciones de Llamadas

1. Inicia sesión como usuario autenticado
2. Abre la consola del navegador
3. Crea una nueva llamada en `llamadas_ventas` con `call_status = 'activa'`
4. Deberías ver:
   - Badge rojo con número en la campana del header
   - Notificación apareciendo en el dropdown

### Test 3: Reinicio al Entrar a Módulo

1. Tiene notificaciones no leídas de Live Chat
2. Haz click en una notificación o navega manualmente a Live Chat
3. Las notificaciones de Live Chat deberían marcarse como leídas automáticamente
4. Repite para Live Monitor

---

## 🐛 Troubleshooting

### Las notificaciones no aparecen

1. **Verificar Realtime:**
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND tablename = 'user_notifications';
   ```
   Si no aparece, ejecuta: `ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;`

2. **Verificar usuario:**
   - Abre la consola del navegador
   - Verifica que `user.id` existe en `AuthContext`
   - Verifica que `notificationService.setUserId()` se llama correctamente

3. **Verificar suscripciones:**
   - Abre la consola del navegador
   - Busca logs de "✅ Suscrito a notificaciones del usuario"
   - Si no aparece, revisa la conexión a Supabase

### Las notificaciones no se marcan como leídas

1. Verifica que el hook `useNotifications` se está usando en los módulos
2. Verifica que `markAllAsRead` se ejecuta correctamente
3. Revisa la consola por errores de permisos RLS

### El badge no se actualiza

1. Verifica que `subscribeToNotifications` está activo
2. Verifica que `onCountChange` se está llamando
3. Revisa la consola por errores de actualización

---

## 📊 Estructura de Datos

### Tabla `user_notifications`

```typescript
{
  id: string;                    // UUID
  user_id: string;               // UUID del usuario
  notification_type: 'new_message' | 'new_call';
  module: 'live-chat' | 'live-monitor';
  message_id?: string;           // Para mensajes
  conversation_id?: string;       // Para mensajes
  prospect_id?: string;           // ID del prospecto/cliente
  customer_name?: string;         // Nombre del cliente
  customer_phone?: string;        // Teléfono del cliente
  message_preview?: string;       // Vista previa del mensaje
  call_id?: string;               // Para llamadas
  call_status?: string;           // Estado de la llamada
  is_read: boolean;               // Si está leída
  read_at?: string;               // Timestamp de lectura
  created_at: string;             // Timestamp de creación
}
```

---

## 🔐 Permisos RLS (Row Level Security)

Si necesitas configurar RLS, ejecuta:

```sql
-- Habilitar RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuarios solo pueden actualizar sus propias notificaciones
CREATE POLICY "Users can update own notifications"
  ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Sistema puede insertar notificaciones (usar service_role)
-- Las notificaciones se crean desde el backend con service_role, no desde el cliente
```

---

## 📝 Notas Adicionales

1. **Limpieza automática:** La función `cleanup_old_notifications()` elimina notificaciones leídas de más de 7 días. Puedes ejecutarla manualmente o configurar un cron job en Supabase.

2. **Performance:** Las notificaciones se limitan a 20 por defecto en el dropdown. Puedes ajustar este límite en `NotificationBell.tsx`.

3. **Personalización:** Puedes personalizar los colores, iconos y estilos en `NotificationBell.tsx` según tus necesidades.

4. **Extensibilidad:** Para agregar nuevos tipos de notificaciones:
   - Agrega el tipo en `notification_type` CHECK constraint
   - Actualiza `NotificationBell.tsx` para manejar el nuevo tipo
   - Actualiza `NotificationListener.tsx` para escuchar los eventos correspondientes

---

## ✅ Checklist de Despliegue

- [ ] Tabla `user_notifications` creada en system_ui
- [ ] Realtime habilitado para `user_notifications`
- [ ] Índices creados correctamente
- [ ] Componente `NotificationBell` visible en el header
- [ ] Componente `NotificationListener` montado en MainApp
- [ ] Hook `useNotifications` integrado en Live Chat y Live Monitor
- [ ] Test de notificaciones de mensajes funcionando
- [ ] Test de notificaciones de llamadas funcionando
- [ ] Test de reinicio al entrar a módulo funcionando
- [ ] RLS configurado (si es necesario)

---

## 🎉 ¡Listo!

El sistema de notificaciones está completamente implementado y listo para usar. Las notificaciones aparecerán automáticamente cuando haya nuevos mensajes o llamadas, y se reiniciarán al ingresar a cada módulo.

