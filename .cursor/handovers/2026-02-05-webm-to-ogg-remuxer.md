# Handover: WebM→OGG Remuxer - Notas de Voz WhatsApp

**REF:** HANDOVER-2026-02-05-WEBM-OGG-REMUXER  
**Fecha:** 2026-02-05  
**Módulo:** WhatsApp (LiveChatCanvas), Audio Utils  
**Estado:** ✅ COMPLETADO

---

## 📋 Resumen Ejecutivo

Implementación de un remuxer WebM→OGG puro en frontend para que los audios grabados lleguen a WhatsApp como **notas de voz (PTT)** en lugar de archivos de audio genéricos.

---

## 🐛 Problema

### Síntoma
Los audios grabados en el LiveChat llegaban a WhatsApp como **archivos de audio** (adjuntos), no como **notas de voz** (PTT con forma de onda y reproducción inline).

### Causa Raíz
- Chrome graba audio como `audio/webm;codecs=opus` (no soporta OGG directo)
- WhatsApp requiere **OGG/Opus** para reconocer un audio como nota de voz
- El frontend enviaba el WebM crudo renombrado como `.ogg`, pero el contenedor real seguía siendo WebM
- La conversión MP3 anterior tampoco servía — WhatsApp solo reconoce OGG/Opus como PTT

### Historial de Intentos (Sesiones Previas)
1. **Web Worker + lamejs**: `OfflineAudioContext` no existe en Workers → crash
2. **lamejs en main thread**: `MPEGMode is not defined` por problemas CJS de lamejs con Vite
3. **Wrapper lame.all.js**: Funcionó para MP3, pero WhatsApp mostraba como archivo, no PTT
4. **WebM directo renombrado .ogg**: El contenedor real era WebM, WhatsApp no lo reconocía como PTT

---

## ✅ Solución: Remuxer WebM→OGG sin re-encoding

### Concepto
Cambiar el contenedor del audio sin tocar los datos Opus. Los paquetes Opus son idénticos en WebM y OGG — solo cambia el "envoltorio".

### Implementación

**Archivo creado: `src/utils/webmToOgg.ts`** (~300 líneas, zero dependencias externas)

Componentes:
1. **Parser EBML minimal**: Lee el contenedor WebM (Matroska/EBML) para extraer:
   - `CodecPrivate` (contiene OpusHead del track)
   - `SimpleBlock` elements de cada Cluster (contienen frames Opus crudos)
2. **Writer OGG**: Construye un archivo OGG válido:
   - Página BOS con OpusHead
   - Página OpusTags
   - Páginas de audio con frames Opus agrupados (~4KB por página)
   - Página EOS al final
3. **CRC-32 OGG**: Implementación con polynomial `0x04C11DB7`
4. **TOC Byte Parser**: Lee el primer byte de cada frame Opus para calcular `granule_position` correctamente

### Flujo Completo
```
MediaRecorder (WebM/Opus)
    ↓
webmToOgg() — extrae Opus frames, empaqueta en OGG
    ↓
Base64 del OGG real
    ↓
send-audio-proxy (Edge Function)
    ↓
N8N workflow → Upload GCS (contentType: audio/ogg)
    ↓
uChat API → WhatsApp (tipo: audio → PTT automático por formato OGG/Opus)
```

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/utils/webmToOgg.ts` | **NUEVO** - Remuxer WebM→OGG sin re-encoding |
| `src/components/chat/LiveChatCanvas.tsx` | Integra `webmToOgg()` en `sendAudioMessage`, elimina `convertAudioToMp3` |

### Archivos que ya no se usan (pero no eliminados)
| Archivo | Razón |
|---------|-------|
| `src/utils/lameMp3Encoder.ts` | Ya no se convierte a MP3 |
| `src/workers/audioConverter.worker.ts` | Worker de conversión MP3 obsoleto |

---

## 🔧 Detalles Técnicos

### EBML Element IDs parseados
- `0x1A45DFA3` EBML Header
- `0x18538067` Segment
- `0x1654AE6B` Tracks
- `0xAE` TrackEntry
- `0x63A2` CodecPrivate (OpusHead)
- `0x1F43B675` Cluster
- `0xE7` Timestamp
- `0xA3` SimpleBlock (frames Opus)

### OGG Pages generadas
- Página 0: OpusHead (flag BOS 0x02)
- Página 1: OpusTags (vendor: "pqnc-audio")
- Páginas 2+: Audio data (~4KB por página, múltiples frames)
- Última página: flag EOS 0x04

### Compatibilidad
- Opus siempre usa 48kHz internamente
- Granule position calculada desde TOC byte de cada frame
- Pre-skip extraído de OpusHead (bytes 10-11)

---

## ⚠️ Notas

1. La función `convertAudioToMp3` fue eliminada del código pero el archivo `lameMp3Encoder.ts` persiste como archivo no utilizado
2. El Edge Function `send-audio-proxy` no necesitó cambios — ya acepta base64 y lo pasa a N8N
3. El workflow N8N ya tenía `contentType: "audio/ogg"` configurado desde la sesión anterior
4. Chrome no soporta grabar directamente en OGG — el remuxer es la solución más limpia sin dependencias pesadas (vs ffmpeg.wasm ~25MB o opus-media-recorder abandonado)

---

**Autor:** Claude Agent  
**Revisado:** 2026-02-05
