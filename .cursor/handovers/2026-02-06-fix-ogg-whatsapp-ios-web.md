# Handover: Fix OGG/Opus Audio — WhatsApp Web + iOS Compatibility

**REF:** HANDOVER-2026-02-06-FIX-OGG-WHATSAPP-IOS-WEB  
**Fecha:** 2026-02-06  
**Commits:** e928441, 62e809a, ed409ae  
**Versiones:** v2.5.90, v2.5.91  
**Estado:** ✅ RESUELTO

---

## 📋 Resumen Ejecutivo

Solución definitiva para que los audios grabados en la plataforma se reproduzcan correctamente en **WhatsApp Web, iOS y Android**. Se corrigieron **3 bugs combinados** en el remuxer WebM→OGG y en el workflow N8N.

---

## 🔍 Síntoma Reportado

- Los audios enviados desde LiveChat se reproducían en **Android** pero mostraban **"Este audio ya no está disponible"** en:
  - WhatsApp Web (navegador)
  - WhatsApp iOS
- El archivo OGG era técnicamente "válido" según ffprobe (probe_score=100)
- uChat aceptaba el mensaje (`"status": "ok"`)

---

## 🐛 Causas Raíz (3 bugs combinados)

### Bug 1: `pre_skip=0` en OpusHead (v2.5.90)

**Severidad:** Alta  
**Ubicación:** `src/utils/webmToOgg.ts`

Chrome almacena el delay del encoder Opus en el elemento `CodecDelay` del WebM (EBML ID `0x56AA`) en nanosegundos, pero pone `pre_skip=0` en el `OpusHead` del `CodecPrivate`. En WebM esto funciona porque el reproductor lee `CodecDelay`. En OGG (RFC 7845), el `pre_skip` del OpusHead es la **ÚNICA fuente** de esta información.

**Diagnóstico:**
```
Page 0: OpusHead v=1 ch=1 preskip=0 sr=48000  ← INVÁLIDO
```

**Fix:** Parsear `CodecDelay` del WebM, convertir nanosegundos a samples (`codecDelayNs * 48 / 1000000`), inyectar en bytes 10-11 del OpusHead. Fallback: 312 samples (6.5ms estándar Opus).

### Bug 2: Granule positions 3x debajo (v2.5.91) — **BUG PRINCIPAL**

**Severidad:** Crítica  
**Ubicación:** `src/utils/webmToOgg.ts` → función `getOpusSamplesPerFrame`

Chrome MediaRecorder codifica Opus con TOC byte `0xfb`:
- Config=31 (CELT FB, 20ms = 960 samples por frame)
- **Code=3** (c=3): paquete contiene **M frames** (M está en byte 2)
- Byte 2 = `0x03`: **M=3 frames por paquete**

Cada paquete = 3 × 960 = **2880 samples** (60ms).

La función `getOpusSamplesPerFrame` solo leía el TOC byte pero **ignoraba el frame count `M`** del segundo byte para paquetes code=3. Devolvía 960 en lugar de 2880.

**Resultado:**
```
Page 2: granule=4800  ← INCORRECTO (debería ser 14400)
Page 3: granule=9600  ← INCORRECTO (debería ser 28800)
```

ffmpeg detectaba **"timestamp discontinuity"** en cada página. Android toleraba el error; WhatsApp Web e iOS lo rechazaban.

**Fix:** Renombrar a `getOpusSamplesPerPacket`, recibir el paquete completo, y para code=3 leer `packet[1] & 0x3F` para obtener el frame count real.

### Bug 3: URL firmada con expiración de 5 minutos (v2.5.90)

**Severidad:** Alta  
**Ubicación:** Workflow N8N `[Live chat] Send audio [PROD]` (ID: `uEdx7_-dlfVupvud6pQZ8`)

El nodo `Set URL Publica` usaba `$json.signedUrl` del upload a GCS — una URL firmada con `X-Goog-Expires=300` (5 minutos). Cuando WhatsApp intentaba descargar el audio, la URL ya había expirado.

**Diagnóstico:**
```bash
# URL directa (sin firma) → FUNCIONA (bucket ES público)
curl -I https://storage.googleapis.com/whatsapp-publico/file.ogg  → 200 OK

# URL firmada expirada → FALLA
curl -I https://storage.googleapis.com/whatsapp-publico/file.ogg?X-Goog-Expires=300...  → 400
```

**Fix:** Cambiar `$json.signedUrl` por URL pública directa: `https://storage.googleapis.com/whatsapp-publico/{{ secureFilename }}`

---

## ❌ Intentos que NO Funcionaron

| Intento | Por qué no funcionó |
|---------|---------------------|
| Enviar WebM sin conversión al backend | WhatsApp no reconoce WebM como nota de voz, necesita OGG/Opus |
| Conversión WebM→MP3 con lamejs | WhatsApp requiere OGG/Opus para PTT, no MP3 |
| Web Worker para conversión MP3 | `OfflineAudioContext` no existe en Workers; además MP3 no sirve para PTT |
| Remuxer OGG con `pre_skip=0` | iOS y WhatsApp Web rechazan OGG sin pre_skip válido |
| Remuxer OGG con `pre_skip=312` pero granule incorrecto | ffmpeg detecta "timestamp discontinuity"; WhatsApp Web/iOS lo rechazan |
| URL firmada GCS (5 min o 30 min) | La URL expira antes de que WhatsApp descargue el medio |

---

## ✅ Solución Definitiva

### Frontend: `src/utils/webmToOgg.ts`

1. **Parser EBML mejorado**: Ahora extrae `CodecDelay` (EBML ID `0x56AA`) además de `CodecPrivate`
2. **Pre-skip correcto**: Si OpusHead tiene `pre_skip=0`, inyecta el valor correcto desde `CodecDelay` o fallback 312
3. **Función `getOpusSamplesPerPacket`**: Maneja correctamente todos los codes Opus:
   - Code 0: 1 frame
   - Code 1: 2 frames (CBR)
   - Code 2: 2 frames (VBR)
   - Code 3: M frames (lee `packet[1] & 0x3F`)
4. **Validación OpusHead**: Verifica magic bytes, versión, longitud mínima

### Backend: Workflow N8N

1. **`Set URL Publica`**: Cambiado de `$json.signedUrl` a URL pública directa GCS
2. **`Upload Bucket Privado`**: Content-Type cambiado de `audio/mpeg` a `audio/ogg`

---

## 📁 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/utils/webmToOgg.ts` | Fix pre_skip + fix granule (getOpusSamplesPerPacket) |
| `src/components/chat/LiveChatCanvas.tsx` | Usa webmToOgg para remux, envía .ogg |
| N8N Workflow `uEdx7_-dlfVupvud6pQZ8` | URL pública directa + contentType audio/ogg |

---

## 🔬 Herramientas de Diagnóstico Usadas

```bash
# 1. Extraer audio de ejecución N8N y verificar formato
python3 -c "... base64.b64decode ... raw[:4].hex() ..."  # 4F676753 = OGG ✅

# 2. Parsear estructura OGG completa (páginas, granule, CRC)
python3 -c "... struct.unpack_from('<q', ...) ..."  # Granule positions

# 3. Validar CRC-32 de todas las páginas
python3 -c "... calc_crc(page_bytes) ..."  # Polynomial 0x04C11DB7

# 4. Validar con ffprobe
ffprobe -show_format -show_streams file.ogg  # probe_score=100

# 5. Detectar timestamp discontinuities
ffmpeg -i input.ogg -c:a copy output.ogg  # "timestamp discontinuity: -140000"

# 6. Analizar TOC bytes por paquete
python3 -c "... toc >> 3, toc & 0x03, packet[1] & 0x3F ..."  # config=31, c=3, M=3

# 7. Verificar accesibilidad de URL GCS
curl -I https://storage.googleapis.com/whatsapp-publico/file.ogg  # 200 OK
```

---

## 📚 Referencias Técnicas

- **RFC 7845**: OGG Encapsulation for Opus (granule position, pre_skip)
- **RFC 6716**: Opus Codec (TOC byte, frame packing codes)
- **WebM Opus Spec**: CodecDelay element (EBML ID 0x56AA)
- **Chrome MediaRecorder**: Típicamente usa TOC code=3 con M=3 (60ms packets)

---

## ⏭️ Próximos Pasos

1. Monitorear que los audios se reproduzcan correctamente en todas las plataformas
2. Considerar agregar tests automatizados para el remuxer OGG
3. El error de DB en N8N ("Failed query: UPDATE mensajes_whatsapp") es independiente y necesita fix aparte

---

**Deploy Status:** ✅ COMPLETADO  
**Lecciones Aprendidas:**
- Chrome pone 3 frames por paquete Opus (60ms) — no asumir 1 frame
- `pre_skip` en OpusHead WebM es 0; el delay real está en `CodecDelay`
- Siempre verificar URLs de media firmadas vs públicas para WhatsApp
- ffmpeg `timestamp discontinuity` es la señal clave de granule positions incorrectos
- Android es tolerante con OGG malformados; iOS y WhatsApp Web son estrictos
