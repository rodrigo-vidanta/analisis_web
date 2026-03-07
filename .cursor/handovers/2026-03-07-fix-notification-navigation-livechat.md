# Fix: Navegacion rota desde Notificaciones a WhatsApp/LiveChat

**Fecha:** 2026-03-07
**Archivos modificados:** 2

## Problema

Al hacer click en una notificacion (requiere_atencion, prospecto_asignado, etc.), la notificacion se eliminaba correctamente pero NO navegaba al modulo WhatsApp con el prospecto seleccionado.

## Causa Raiz

Defecto de diseno en el patron de comunicacion entre modulos. El flujo dependia de:

```
setAppMode('live-chat') → localStorage.setItem('livechat-prospect-id', id)
                                       ↓
                            LiveChatCanvas useEffect([conversations.length])
                                       ↓
                            selectConversationByProspectId()
```

El useEffect de LiveChatCanvas solo se ejecuta cuando `conversations.length` cambia. Si el usuario **ya esta en live-chat**, `setAppMode('live-chat')` no produce cambio, LiveChatCanvas no se re-monta, y localStorage queda sin leer.

## 3 Bugs Corregidos

### Bug 1 (Principal): Sin navegacion cuando ya esta en live-chat
- **Archivo:** `src/components/notifications/NotificationSystem.tsx` (handleNavigate)
- **Archivo:** `src/components/chat/LiveChatCanvas.tsx` (nuevo listener)
- **Fix:** Nuevo CustomEvent `select-livechat-prospect` que LiveChatCanvas escucha directamente. No depende de cambio de modulo ni de useEffect deps.

### Bug 2: Formato incorrecto en evento CustomEvent (fallback path)
- **Archivo:** `src/components/notifications/NotificationSystem.tsx` linea 539
- **Antes:** `detail: { prospectoId }` (objeto) → MainApp guardaba `"[object Object]"` en localStorage
- **Despues:** `detail: prospectoId` (string)

### Bug 3: Sin feedback cuando falta prospecto_id
- **Archivo:** `src/components/notifications/NotificationSystem.tsx` (handleNotificationClick)
- **Fix:** `console.warn` cuando notificacion no tiene `prospecto_id` en metadata

## Cambios por Archivo

### `src/components/chat/LiveChatCanvas.tsx`
- Nuevo listener `select-livechat-prospect` en el useEffect de linea ~4000
- Llama a `selectConversationByProspectId()` (funcion existente con busqueda robusta por metadata, prospecto_id, whatsapp, y fallback BD)
- Limpia localStorage al recibir el evento

### `src/components/notifications/NotificationSystem.tsx`
- `handleNavigate`: ahora siempre guarda localStorage primero, despacha `select-livechat-prospect` con 100ms delay
- `handleNotificationClick`: console.warn si no hay prospecto_id
- Fallback path: `detail: prospectoId` (string, no objeto)

### `src/components/Header.tsx`
- Sin cambios necesarios. El evento se despacha desde `handleNavigate` en NotificationSystem (punto central para dropdown y toast).

## Flujo Corregido

| Escenario | Mecanismo |
|-----------|-----------|
| Desde otro modulo → live-chat | `setAppMode` cambia modulo → LiveChatCanvas monta → useEffect lee localStorage + evento como respaldo |
| Ya en live-chat | `setAppMode` no cambia → evento `select-livechat-prospect` capturado por LiveChatCanvas ya montado |
| Toast notification click | Usa el mismo `handleNavigate` → mismo fix aplica |
| Fallback sin callback | Evento `navigate-to-livechat` ahora envia string correcta |

## Leccion Aprendida

El patron `setAppMode + localStorage + useEffect([deps])` es fragil para comunicacion entre modulos. Solo funciona cuando hay cambio de modulo (mount fresco). Para casos donde el componente destino ya esta montado, usar CustomEvents como canal directo es mas confiable.

## Verificacion

1. Desde Dashboard, click notificacion → navega a live-chat y selecciona conversacion
2. Ya en live-chat, click notificacion → selecciona conversacion sin cambiar modulo
3. Click en toast flotante → mismo comportamiento
4. Navegacion desde Prospectos/LiveMonitor/Dashboard → sigue funcionando (no se toco)
