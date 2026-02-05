# Handover: Función de Mensajes de Voz WhatsApp

**REF:** HANDOVER-2026-02-05-AUDIO-VOICE  
**Fecha:** 2026-02-05  
**Módulo:** WhatsApp Live Chat  
**Estado:** ✅ COMPLETADO

---

## 📋 Resumen Ejecutivo

Implementación completa de envío de mensajes de voz en el módulo de WhatsApp, incluyendo grabación, conversión a MP3 y envío via Edge Function a N8N.

---

## ✅ Funcionalidades Implementadas

### 1. Grabación de Audio
- **Botón de grabación** (icono micrófono) junto al botón de enviar
- **Animación de grabación** con punto rojo pulsante
- **Timer visual** mostrando duración de grabación
- **Límite de 5 minutos** con auto-stop y notificación
- **Sonidos de feedback** para inicio/fin/cancelación

### 2. Conversión de Audio
- **Formato nativo**: `audio/webm;codecs=opus` (Chrome)
- **Conversión a MP3**: Via Web Worker para no bloquear UI
- **Librería**: `lamejs` (~90KB)
- **Progreso visual**: Toast con porcentaje de conversión

### 3. Envío de Audio
- **Edge Function**: `send-audio-proxy`
- **Webhook N8N**: `https://primary-dev-d75a.up.railway.app/webhook/send-audio`
- **Autenticación**: Header `Authorization` con token dedicado `SEND_AUDIO_AUTH`
- **Payload**: `{ audio_base64, uchat_id, filename, id_sender }`

### 4. UI/UX
- **Botón cancelar** (icono basura) durante grabación
- **Overlay de grabación** sobre el textarea
- **Estados visuales**: Grabando, convirtiendo, enviando
- **Toast notifications** para éxito/error

---

## 📁 Archivos Creados/Modificados

### Nuevos
| Archivo | Descripción |
|---------|-------------|
| `src/workers/audioConverter.worker.ts` | Web Worker para conversión WebM→MP3 |
| `supabase/functions/send-audio-proxy/index.ts` | Edge Function proxy a N8N |
| `AUDIO_MP3_CONVERSION.md` | Documentación de la feature |

### Modificados
| Archivo | Cambios |
|---------|---------|
| `src/components/chat/LiveChatCanvas.tsx` | Estados, funciones y UI de grabación |
| `vite.config.ts` | Configuración de Web Workers |
| `package.json` | Dependencia `lamejs` |

---

## 🔧 Configuración Requerida

### Supabase Secrets
| Secret | Descripción |
|--------|-------------|
| `SEND_AUDIO_AUTH` | Token para webhook de audio (diferente a `LIVECHAT_AUTH`) |

### N8N Webhook
- **URL**: `https://primary-dev-d75a.up.railway.app/webhook/send-audio`
- **Credencial**: `send_voice_message`
- **Header Name**: `Authorization`
- **Value**: Token dedicado para audio

---

## 🧪 Casos de Prueba

| Caso | Resultado Esperado |
|------|-------------------|
| Grabar 10 segundos | Audio se envía correctamente |
| Grabar 5+ minutos | Auto-stop con notificación |
| Cancelar grabación | Se detiene sin enviar |
| Error de N8N | Toast con mensaje de error |
| Sin micrófono | Toast de error de permisos |

---

## ⚠️ Limitaciones Conocidas

1. **Solo Chrome/Edge**: Otros navegadores pueden no soportar `audio/webm;codecs=opus`
2. **Tamaño máximo**: ~5MB para 5 minutos de audio
3. **Sin preview**: No hay reproducción antes de enviar (feature futura)

---

## 📚 Referencias

- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [lamejs](https://github.com/zhuker/lamejs)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

---

**Autor:** Claude Agent  
**Revisado:** 2026-02-05
