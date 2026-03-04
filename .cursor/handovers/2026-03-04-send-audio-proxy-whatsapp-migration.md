# Handover: send-audio-proxy migración uchat_id → whatsapp

**Fecha:** 2026-03-04
**Estado:** Completado
**Archivos modificados:** 2

## Contexto

El workflow N8N de envío de audio ahora rutea por número `whatsapp` en vez de `uchat_id`. Se necesitaba actualizar la Edge Function y el frontend para enviar el campo correcto.

## Cambios

### 1. Edge Function: `send-audio-proxy`
**Archivo:** `supabase/functions/send-audio-proxy/index.ts`

- **Antes:** Requería `uchat_id` en el payload, lo reenviaba a N8N
- **Después:** Requiere `whatsapp` (número completo con código país, solo dígitos)
- Validación: `audio_base64` + `whatsapp` obligatorios
- Default filename cambiado de `audio.mp3` a `audio.ogg`

**Payload anterior a N8N:**
```json
{
  "audio_base64": "...",
  "uchat_id": "f190385u394247863",
  "filename": "audio_xxx.ogg",
  "id_sender": "uuid"
}
```

**Payload nuevo a N8N:**
```json
{
  "audio_base64": "...",
  "whatsapp": "5219621661461",
  "filename": "audio_xxx.ogg",
  "id_sender": "uuid"
}
```

### 2. Frontend: `LiveChatCanvas.tsx`
**Archivo:** `src/components/chat/LiveChatCanvas.tsx` (~línea 6584)

- Eliminada lógica de branching uchat/twilio para audio
- Ahora siempre envía `whatsapp` del prospecto (sin importar proveedor)
- Eliminados campos `uchat_id` y `provider` del payload
- Validación simplificada: solo verifica que exista `whatsapp`
- Pause bot usa `prospecto_id` directamente (sin branching)

## Deploy requerido

1. **Edge Function:** `supabase functions deploy send-audio-proxy`
2. **Frontend:** build + S3 + CloudFront invalidation

## Dependencias

- El workflow N8N de audio (`/webhook/send-audio`) ya debe estar actualizado para recibir `whatsapp` en vez de `uchat_id`
