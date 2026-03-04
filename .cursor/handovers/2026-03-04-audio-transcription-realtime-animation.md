# Handover: Animacion "Transcribiendo..." + Realtime para transcripcion de audio

**Fecha:** 2026-03-04
**Archivo modificado:** `src/components/chat/LiveChatCanvas.tsx`

## Contexto

Cuando un usuario envia un audio en el chat, la plataforma transcribe el audio via LLM. La transcripcion tarda unos segundos y se almacena en `adjuntos[0].descripcion` (JSONB) de `mensajes_whatsapp`, NO en el campo `mensaje` (que queda como `""`).

Antes de este cambio:
- No habia indicador visual de que la transcripcion estaba en progreso
- La transcripcion no llegaba via Realtime (el UPDATE handler solo procesaba `status` y `status_delivery`)
- El usuario tenia que recargar la pagina para ver la transcripcion

## Cambios realizados

### 1. Animacion "Transcribiendo..." (~linea 9129)

**Path "sin globo"** (donde se renderizan audios y stickers sin burbuja de chat):

- Se detecta si algun adjunto es audio SIN `descripcion` (transcripcion pendiente)
- Si es asi, se muestra `Transcribiendo...` con texto pequeno (`text-[11px]`), italica y `animate-pulse` (opacidad pulsa 1 → 0.5 → 1 cada 2s)
- Alineacion: izquierda para mensajes del prospecto, derecha para agente/bot
- La animacion desaparece automaticamente cuando la transcripcion llega via Realtime

### 2. Realtime UPDATE para transcripcion (~linea 2296)

**SUSCRIPCION 1.5** extendida para detectar transcripciones:

- `hasTranscriptionInAdjuntos`: early filter - verifica si el UPDATE trae adjuntos con audio que tiene `descripcion`
- `transcriptionArrived`: guard dentro del state setter - solo actualiza si el audio en memoria NO tenia `descripcion` aun
- Cuando se confirma, reemplaza `adjuntos` completo en el mensaje → React re-renderiza → MultimediaMessage muestra la transcripcion debajo del player

## Dato clave: donde vive la transcripcion

```
mensajes_whatsapp.adjuntos (JSONB):
[{
  "tipo": "Audio",
  "bucket": "whatsapp_pqnc_multimedia",
  "filename": "abc123.ogg",
  "descripcion": "Hola, este es el texto transcrito...",  // <-- AQUI
  "transcription_id": "...",
  "language": "spa"
}]
```

- `mensaje` (text) = `""` para audios (NO contiene la transcripcion)
- `adjuntos[0].descripcion` = transcripcion del audio
- El UPDATE a `adjuntos` JSONB SI dispara Realtime (tabla en `supabase_realtime`, REPLICA IDENTITY DEFAULT)

## Flujo completo

1. Audio llega → INSERT en `mensajes_whatsapp` (adjuntos sin `descripcion`)
2. Frontend recibe INSERT via Realtime → muestra audio player + "Transcribiendo..."
3. LLM transcribe → UPDATE `adjuntos` JSONB con `descripcion`
4. Frontend recibe UPDATE via Realtime → detecta transcripcion → actualiza adjuntos en memoria
5. React re-renderiza → MultimediaMessage muestra transcripcion → animacion desaparece

## Impacto en performance

- El early filter `hasTranscriptionInAdjuntos` parsea adjuntos solo para UPDATEs que tienen adjuntos con audio + descripcion
- Para la mayoria de UPDATEs (status_delivery), el filtro existente ya los procesa sin tocar adjuntos
- El guard `transcriptionArrived` evita actualizaciones redundantes si la transcripcion ya estaba en memoria
