# Handover: Unificación Envío Mensajes Twilio — Livechat

**Fecha:** 2026-03-03
**Estado:** Implementado, pendiente deploy frontend (Edge Function ya deployada)
**Contexto previo:** `2026-03-02-multiproveedor-uchat-twilio-frontend.md`

---

## Resumen

Se unificó el envío de mensajes (texto + imágenes) a un solo endpoint y Edge Function. Todos los mensajes ahora salen por Twilio via `/webhook/send-message`. Los prospectos con `whatsapp_provider = 'uchat'` ven UI de reactivación con plantilla (no tienen sesión Twilio abierta). Se agregó badge visual de proveedor en el avatar del chat.

---

## Cambios Realizados

### 1. Edge Function: `send-message-proxy` (DEPLOYADA)

**Archivo:** `supabase/functions/send-message-proxy/index.ts`

- Eliminó toda lógica de routing por proveedor
- Siempre envía a `https://primary-dev-d75a.up.railway.app/webhook/send-message`
- Header auth: `2025_livechat_auth`
- Payload unificado: `{ whatsapp, message?, imagenes?, caption?, id_sender? }`
- Al menos `message` o `imagenes` requerido, `whatsapp` siempre requerido
- Propaga respuestas estructuradas de N8N (`{ success, error, error_code }`)

**Payloads aceptados:**
```json
// Texto
{ "whatsapp": "5213315127354", "message": "Hola", "id_sender": "uuid" }

// Imagen (nombre_archivo, NO URL)
{ "whatsapp": "5213315127354", "imagenes": ["abc123.jpg"], "id_sender": "uuid" }

// Imagen con caption
{ "whatsapp": "5213315127354", "imagenes": ["abc123.jpg"], "caption": "Vista", "id_sender": "uuid" }
```

**IMPORTANTE:** `imagenes` es array de **nombres de archivo** (ej: `9f4fe550af401429ffbe0a475111f807.jpg`), NO URLs. El backend N8N genera las signed URLs de GCS internamente.

### 2. Frontend: Envío de Texto (`LiveChatCanvas.tsx`)

- Eliminó funciones duales `sendMessageToUChat()` + `sendMessageToTwilio()`
- Reemplazó con función unificada `sendMessage(message, whatsapp, idSender)`
- `handleSendMessage()` simplificado — siempre usa `whatsapp`, sin routing por proveedor
- Fallback para obtener `whatsapp`: `conversation.metadata?.whatsapp` → `conversation.whatsapp` → `prospectosDataRef`

### 3. Frontend: Envío de Imágenes (3 archivos)

| Archivo | Cambio |
|---------|--------|
| `ImageCatalogModal.tsx` | `imagenes: [imageItem.nombre_archivo]` via `send-message-proxy` |
| `ImageCatalogModalV2.tsx` | `imagenes: [currentItem.nombre_archivo]` via `send-message-proxy` |
| `media-selector/useImageCatalog.ts` | `imagenes: [currentImage.item.nombre_archivo]` via `send-message-proxy` |

Antes usaban `send-img-proxy` con URLs firmadas o thumbnails. Ahora usan `send-message-proxy` con nombres de archivo.

### 4. Ventana 24h + Reactivación con Plantilla

**`isWithin24HourWindow()`** — Modificada para retornar `false` cuando `whatsapp_provider === 'uchat'`, forzando la UI de reactivación con plantilla (Twilio no tiene sesión para estos prospectos).

**UI de reactivación:**
- Botón "Reactivar con Plantilla" re-habilitado (se había deshabilitado por mantenimiento)
- Mensaje de mantenimiento eliminado
- Texto adaptativo:
  - Provider uchat: "Sesión de Twilio no iniciada — Envía una plantilla para iniciar la conversación"
  - Ventana expirada: "Han pasado Xh desde el último mensaje del usuario..."

### 5. Badge Proveedor en Avatar

En el header del chat, sobre el avatar del prospecto:
- **T** (verde esmeralda `bg-emerald-500`) → Twilio
- **U** (azul `bg-blue-500`) → uChat

Círculo de 16px en esquina inferior-derecha del avatar, con ring blanco.

### 6. Campo `bloqueado_whatsapp`

- Agregado al tipo `prospectosDataRef` y query de prospectos
- Badge rojo "Bloqueado" en header del chat cuando `bloqueado_whatsapp = true`
- Banner de advertencia sobre el input cuando prospecto está bloqueado
- Detección Realtime de cambios en `bloqueado_whatsapp`

### 7. BD: RPC `get_dashboard_conversations` (MIGRACIÓN APLICADA)

**Migración:** `add_whatsapp_provider_to_get_dashboard_conversations`

Ambos overloads (6 y 7 params) actualizados:
- Agregó `COALESCE(p.whatsapp_provider, 'uchat')::TEXT as whatsapp_provider` al SELECT
- Agregó `whatsapp_provider text` al RETURNS TABLE
- PostgREST schema recargado via `NOTIFY pgrst, 'reload schema'`

### 7b. BD: RPC `search_dashboard_conversations` (MIGRACIÓN APLICADA)

**Migración:** `add_whatsapp_provider_to_search_dashboard_conversations`

- DROP + CREATE (cambio de return type requiere drop previo)
- Agregó `COALESCE(p.whatsapp_provider, 'uchat')::TEXT as whatsapp_provider` al SELECT
- Agregó `whatsapp_provider text` al final del RETURNS TABLE
- PostgREST schema recargado via `NOTIFY pgrst, 'reload schema'`
- **Contexto:** Los resultados de búsqueda manual (filtros) pasaban por `optimizedConversationsService.convertToConversationFormat()` que ya mapeaba `whatsapp_provider`, pero el RPC no lo devolvía → badge siempre mostraba 'U' (default) en búsquedas.

### 8. Legacy Path: Propagación de `whatsapp_provider`

El frontend usa el legacy path (`VITE_USE_OPTIMIZED_LIVECHAT` NO está seteado). Se corrigieron 3 puntos donde se perdía `whatsapp_provider`:

1. **Transformación `mv_conversaciones_dashboard`** (línea ~4006): Agregó `whatsapp_provider: row.whatsapp_provider`
2. **Query batch de `prospectos`** (línea ~4093): Agregó `whatsapp_provider` al SELECT
3. **Construcción de `Conversation`** (línea ~4341): Agregó `whatsapp_provider` al objeto y metadata

### 9. Realtime: `whatsapp_provider` en Tiempo Real

Handler de Realtime para prospectos UPDATE detecta cambios en `whatsapp_provider`:
- Actualiza `prospectosDataRef`
- Actualiza la conversación en `conversations` state (objeto + metadata)
- Si es la conversación seleccionada, actualiza `selectedConversation` forzando re-render
- Resultado: badge T/U cambia en vivo, `isWithin24HourWindow()` se recalcula, UI de reactivación se libera automáticamente
- Log: `🔄 [Realtime] whatsapp_provider cambió para {id}: uchat → twilio`

---

## Archivos Modificados (6)

| Archivo | Tipo | Detalle |
|---------|------|---------|
| `supabase/functions/send-message-proxy/index.ts` | Edge Function | Unificación endpoint, deployada |
| `src/components/chat/LiveChatCanvas.tsx` | Frontend | Envío, 24h window, badge, bloqueado |
| `src/components/chat/ImageCatalogModal.tsx` | Frontend | Imágenes via send-message-proxy |
| `src/components/chat/ImageCatalogModalV2.tsx` | Frontend | Imágenes via send-message-proxy |
| `src/components/chat/media-selector/useImageCatalog.ts` | Frontend | Imágenes via send-message-proxy |
| `src/App.tsx` | Frontend | Cambio menor |

---

## Migraciones BD Aplicadas

| Nombre | Qué hizo |
|--------|----------|
| `add_whatsapp_provider_to_get_dashboard_conversations` | Agregó `whatsapp_provider` a ambos overloads del RPC |
| `add_whatsapp_provider_to_search_dashboard_conversations` | Agregó `whatsapp_provider` al RPC de búsqueda (DROP+CREATE) |

---

## Lecciones Aprendidas

1. **Los documentos de handover del backend NO siempre son exactos.** El endpoint NO cambió a `/webhook/twilio-livechat-send` como decían los docs — sigue siendo `/webhook/send-message`. Siempre verificar con el usuario.

2. **`imagenes` envía nombres de archivo, NO URLs.** El backend N8N genera las signed URLs de GCS. Enviar URLs firmadas o thumbnails causa `"Failed to get signed URL from GCS"`.

3. **`VITE_USE_OPTIMIZED_LIVECHAT` no está habilitado.** El frontend usa el legacy path, NO el servicio optimizado. Cualquier cambio a datos de conversaciones debe hacerse en AMBOS paths.

4. **PostgREST cachea schemas de funciones.** Al cambiar el return type de un RPC, ejecutar `NOTIFY pgrst, 'reload schema'` para que los nuevos campos sean visibles via API.

5. **`whatsapp_provider` fluye por múltiples capas.** BD → RPC/Vista → Servicio → Conversación → `prospectosDataRef` → UI. Si falla en cualquier punto, cae al default `'uchat'`.

---

## Pendientes

- [ ] Deploy frontend a AWS (build exitoso, falta `npm run deploy`)
- [ ] `send-img-proxy` Edge Function — ya no se usa para Twilio, considerar deprecar
- [ ] Probar envío de imágenes E2E (error GCS fue del backend N8N, ya resuelto por el usuario)
- [ ] Probar reactivación con plantilla para prospectos uchat
- [ ] Considerar habilitar `VITE_USE_OPTIMIZED_LIVECHAT=true` para eliminar legacy path
