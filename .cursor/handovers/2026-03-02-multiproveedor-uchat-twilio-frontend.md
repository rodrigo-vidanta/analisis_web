# Handover: Migración Multiproveedor uChat/Twilio — Frontend + Edge Functions

**Fecha:** 2026-03-02
**Estado:** Implementación completa, pendiente deploy y pruebas E2E
**Branch:** main (cambios sin commit)

---

## Contexto

El backend migró el envío de mensajes WhatsApp de uChat a Twilio. El frontend ahora soporta **ambos proveedores simultáneamente** (multiproveedor). La BD ya tenía preparado:
- `prospectos.whatsapp_provider` (NOT NULL): `'uchat'` (7,767) | `'twilio'` (2+)
- `bot_pause_status.prospecto_id` (uuid, FK a prospectos, backfilled 98.9%)
- `bot_pause_status.uchat_id` ahora nullable
- Trigger temporal `trg_bot_pause_resolve_prospecto` (DROPEAR después del deploy)

**Criterio de routing:** `prospectos.whatsapp_provider` determina qué flujo usar.
**Documento de referencia backend:** `/Users/darigsamuelrosalesrobledo/Downloads/CAMBIOS-FRONTEND.md`

---

## Archivos Modificados (12 archivos de migración)

### 1. BD: Vista Materializada `mv_conversaciones_dashboard`
- **Migración aplicada** via MCP `apply_migration` (nombre: `add_whatsapp_provider_to_mv_conversaciones`)
- Agregó `p.whatsapp_provider` a la definición de la vista
- DROP + CREATE + REFRESH ejecutado exitosamente
- Verificado: 7767 uchat, 2 twilio en vista refrescada

### 2. `src/services/botPauseService.ts`
- `BotPauseStatus` interface: `uchat_id` ahora `string | null`, agregó `prospecto_id?: string | null`
- `UUID_REGEX` para validar prospecto_id
- Nuevos métodos paralelos (no tocan los existentes):
  - `isValidProspectoId(prospectoId)` — validación UUID
  - `savePauseByProspectoId(prospectoId, durationMinutes, pausedBy)` — upsert por prospecto_id
  - `getPauseByProspectoId(prospectoId)` — query por prospecto_id
  - `resumeBotByProspectoId(prospectoId)` — update por prospecto_id
- Helper privado `buildPauseData()` para evitar duplicación

### 3. `src/services/optimizedConversationsService.ts`
- `DashboardConversation` interface: agregó `whatsapp_provider: string`
- `loadComplementaryData()`: indexación dual de bot_pause_status por `uchat_id` Y `prospecto_id`
- `convertToConversationFormat()`: propaga `whatsapp_provider` a root y `metadata` (con campo `whatsapp`)
- `buildProspectosDataMap()`: incluye `whatsapp_provider` en entradas del mapa

### 4. `src/components/chat/media-selector/types.ts`
- `ProspectoData`: `id_uchat` ahora opcional (`id_uchat?: string`), agregó `whatsapp_provider: string`
- `MediaSelectorModalProps.onPauseBot`: param renombrado de `uchatId` a `id` (agnóstico de proveedor)

### 5. `src/components/chat/media-selector/useImageCatalog.ts`
- `loadProspectoData()`: SELECT incluye `whatsapp_provider`
- `executeImageSend()`: routing por `prospectoData.whatsapp_provider`:
  - Twilio: payload sin `uchat_id`, con `provider: 'twilio'` y `whatsapp`
  - uChat: payload original
  - Pausa bot: por `prospecto_id` (Twilio) o `uchat_id` (uChat)
- `handleSendImages()`: validación provider-aware (whatsapp siempre, id_uchat solo para uchat)
- Mensajes de error específicos con toast

### 6. `src/components/chat/ImageCatalogModal.tsx`
- Mismo patrón que useImageCatalog: `whatsapp_provider` en prospectoData, validación por proveedor, payload condicional, pausa dual
- `onPauseBot` prop param renombrado a `id`

### 7. `src/components/chat/ImageCatalogModalV2.tsx`
- **NO usa** `useImageCatalog` hook — tiene implementación propia
- Aplicados mismos cambios: `whatsapp_provider` en state, validación provider-aware, payload condicional
- `onPauseBot` prop param renombrado a `id`

### 8. `src/components/chat/LiveChatCanvas.tsx` (cambio principal)
- **8a. Interface Conversation**: agregó `whatsapp_provider?: string`, `whatsapp?: string`, `metadata` tipado como `Record<string, unknown>`
- **8b. `sendMessageToTwilio()`**: nueva función que envía via `authenticatedEdgeFetch('send-message-proxy')` con `{mensaje, whatsapp, provider: 'twilio', id_sender}`
- **8c. `handleSendMessage()`**: routing completo por proveedor:
  - Detecta provider de `selectedConversation.whatsapp_provider` || `metadata.whatsapp_provider`, default `'uchat'`
  - Twilio: valida `whatsapp`, pausa por `prospecto_id`, llama `sendMessageToTwilio()`
  - uChat: valida `uchatId`, pausa por `uchatId`, llama `sendMessageToUChat()`
  - Toast de error visible (antes era console.error silencioso)
- **8d. `pauseBot()` / `resumeBot()`**: detección automática UUID vs formato uchat → llama al método de servicio correspondiente
- **8e. `loadBotPauseStatus` + Realtime subscription**: indexación dual por `uchat_id` Y `prospecto_id`
- **8f. Bot pause UI button**: detecta `whatsapp_provider` y usa `prospecto_id` como key para Twilio
- **8f. Lista conversaciones**: busca pausa por `uchatId` || `prospecto_id`
- **8f. Quick replies**: pausa con ID correcto según proveedor
- **8g. `sendAudioMessage()`**: validación provider-aware, payload condicional (`whatsapp` + `provider` para Twilio, `uchat_id` para uChat), pausa por ID correcto

### 9. `src/components/dashboard/widgets/ConversacionesWidget.tsx`
- Indexación dual en `loadBotPauseStatus` y suscripción Realtime
- 3 lookups actualizados para buscar por `uchatId` || `prospecto_id` || `prospect_id`
- `BotPauseButton` recibe `pauseId` correcto según proveedor

### 10. `supabase/functions/send-message-proxy/index.ts`
- Acepta campo `provider` en payload (default `'uchat'`)
- Twilio: valida `mensaje` + `whatsapp`, forward a `/webhook/twilio-livechat-send` con `{mensaje, whatsapp, id_sender}`
- uChat: flujo original sin cambios
- Provider no reconocido → 400

### 11. `supabase/functions/send-img-proxy/index.ts`
- Detecta `provider` de `payload[0].provider`
- Twilio: valida `whatsapp`, forward a `/webhook/twilio-livechat-send`
- uChat: flujo original
- Provider no reconocido → 400

---

### 12. `src/components/chat/BotPauseButton.tsx` — Renombre prop agnóstico
- Prop `uchatId` renombrado a `pauseId` (acepta uchat_id o prospecto_id UUID)
- Callbacks `onPause(uchatId, ...)` → `onPause(id, ...)`; `onResume(uchatId)` → `onResume(id)`
- Internamente usa `pauseId` en `handleMainButtonClick` y `handlePauseSelect`
- Consumidores actualizados: `LiveChatCanvas.tsx:8309`, `ConversacionesWidget.tsx:2801`

## Archivos NO modificados
- `supabase/functions/send-audio-proxy/index.ts` — ya migrado previamente por backend
- `src/services/uchatService.ts` — se mantiene para prospectos uChat

---

## Archivos con cambios NO relacionados (en el mismo diff)
- `src/components/chat/ImportWizardModal.tsx` — cambios de otra tarea
- `src/services/dynamicsLeadService.ts` — cambios de otra tarea

---

## Verificación realizada
- [x] TypeScript `tsc --noEmit` — sin errores
- [x] Build de producción `npm run build` — exitoso (18.55s)

## Verificación pendiente (pruebas manuales)
- [ ] **Prospecto uChat existente**: enviar texto, imagen, audio → debe funcionar exactamente igual
- [ ] **Prospecto Twilio (sin id_uchat)**: enviar texto → debe usar endpoint Twilio, recibir `twilio_sid`
- [ ] **Prospecto Twilio**: enviar imagen → endpoint unificado, sin `uchat_id` en payload
- [ ] **Bot pause Twilio**: pausar → debe insertar en BD con `prospecto_id`
- [ ] **Bot pause uChat**: pausar → debe funcionar igual que hoy
- [ ] **Vista materializada**: verificar que `whatsapp_provider` aparece en conversaciones cargadas
- [ ] **Audio Twilio**: enviar audio → debe incluir `whatsapp` + `provider: 'twilio'` en payload
- [ ] **Errores**: prospecto Twilio sin whatsapp → toast claro. Prospecto uChat sin uchat_id → toast claro

## Acciones post-deploy
1. **Deploy Edge Functions**: `send-message-proxy` y `send-img-proxy` deben desplegarse a Supabase
2. **DROPEAR trigger temporal**: `DROP TRIGGER IF EXISTS trg_bot_pause_resolve_prospecto ON bot_pause_status;` y `DROP FUNCTION IF EXISTS resolve_prospecto_id_for_pause();`
3. **Refrescar vista materializada** si no se ha hecho: `REFRESH MATERIALIZED VIEW mv_conversaciones_dashboard;`

---

## Diagrama de flujo por proveedor

```
Frontend detecta whatsapp_provider
  ├── 'twilio'
  │   ├── Texto: sendMessageToTwilio() → send-message-proxy → /webhook/twilio-livechat-send
  │   ├── Imagen: send-img-proxy → /webhook/twilio-livechat-send
  │   ├── Audio: send-audio-proxy (ya migrado) con whatsapp + provider
  │   └── Bot pause: savePauseByProspectoId(prospecto_id)
  │
  └── 'uchat' (default)
      ├── Texto: sendMessageToUChat() → send-message-proxy → /webhook/send-message
      ├── Imagen: send-img-proxy → /webhook/send-img
      ├── Audio: send-audio-proxy con uchat_id
      └── Bot pause: savePauseStatus(uchat_id)
```

## Diagnóstico: Discrepancia bot pause frontend vs backend

**Prospecto investigado:** `fbbbb22a-5542-4c8b-a268-fbdfe3fffa32` (Gemma, uchat, `f190385u417064763`)

**Estado en BD:**
- `is_paused = false` | `paused_until = 2026-03-02 23:06:14` | `duration_minutes = null`

**Hallazgo:** El frontend muestra correctamente "sin pausa" (`getAllActivePauses` filtra `is_paused = true`). El backend (N8N) probablemente consulta `paused_until > NOW()` sin verificar `is_paused`, causando que siga viendo al prospecto como pausado.

**Acción requerida:** Verificar con el dev de backend qué query usa N8N para determinar pausa. Debe filtrar por `is_paused = true AND paused_until > NOW()`, no solo por `paused_until > NOW()`.

**Dato sospechoso:** `duration_minutes = null` (indefinido) pero `paused_until` muestra solo ~2.5 min después de `paused_at`. Inconsistente — una pausa indefinida debería tener `paused_until` a 30 días.

---

## Plan de referencia
El plan completo está en: `/Users/darigsamuelrosalesrobledo/.claude/plans/fluttering-strolling-horizon.md`
