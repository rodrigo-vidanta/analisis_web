# 🎧 Implementación de Monitoreo de Audio en Tiempo Real

## Información del Proyecto

| Campo | Valor |
|-------|-------|
| **Módulo** | Dashboard - ActiveCallDetailModal |
| **Versión** | B4.3.0N6.0.0 |
| **Fecha** | 10 de Diciembre 2025 |
| **Archivo Principal** | `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` |
| **Punto de Rollback** | `git tag: v4.2.1-pre-audio-monitor` |

---

## 📋 Resumen Ejecutivo

Se implementó la funcionalidad de monitoreo de audio en tiempo real para llamadas activas en el Dashboard. Esta característica permite a los usuarios escuchar las llamadas de ventas mientras ocurren, con controles de volumen independientes para cada canal (Agente IA y Cliente).

---

## 🔍 Proceso de Investigación

### 1. Identificación de la URL de Monitoreo

Se encontró que VAPI almacena la URL de monitoreo en la tabla `llamadas_ventas` con el formato:

```
wss://phone-call-websocket.oci-us-sanjose-1-backend-production{N}.vapi.ai/{call_id}/listen
```

### 2. Análisis del Formato de Audio

Se realizaron múltiples pruebas para identificar el formato correcto:

| Prueba | Sample Rate | Resultado |
|--------|-------------|-----------|
| 1 | μ-law 8kHz | ❌ Ruido estático |
| 2 | PCM 24kHz | ❌ Voz de "ardilla" (muy rápido) |
| 3 | PCM 8kHz | ❌ Voz grave distorsionada |
| 4 | PCM 16kHz | ✅ **Audio correcto** |

### 3. Descubrimiento del Audio Estéreo

Se identificó que VAPI envía audio **estéreo intercalado**:
- **Canal Izquierdo (samples pares)**: Agente IA
- **Canal Derecho (samples impares)**: Cliente/Humano

---

## 🛠️ Solución Implementada

### Arquitectura

```
WebSocket VAPI → Blob/ArrayBuffer → PCM Int16 → 
  → Separación de canales → Aplicar ganancia → 
    → AudioBuffer estéreo → Buffering → 
      → Scheduling preciso → AudioContext → Altavoces
```

### Parámetros Finales de Audio

```typescript
const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,           // 16kHz
  MIN_CHUNK_SIZE: 320,          // Mínimo para procesar
  DEFAULT_LEFT_GAIN: 1.0,       // Agente IA: 100%
  DEFAULT_RIGHT_GAIN: 6.0,      // Humano: 600% (amplificado)
  LATENCY_HINT: 'interactive',  // Baja latencia
};
```

### Sistema de Buffering

Para evitar cortes y micro-gaps en el audio:

1. **Buffer inicial**: Acumula 3 chunks (~60ms) antes de empezar
2. **Scheduling preciso**: Usa `source.start(time)` con timing exacto
3. **Encadenamiento**: Cada chunk se programa para empezar cuando termina el anterior

### Persistencia de Preferencias

Los niveles de volumen por canal se guardan en `localStorage`:
- `pqnc_audio_left_gain`: Ganancia canal izquierdo (IA)
- `pqnc_audio_right_gain`: Ganancia canal derecho (Humano)

---

## 📝 Historial de Cambios

### Iteración 1: Implementación Inicial
- Detección automática de formato (falló)
- Asumía μ-law a 8kHz

### Iteración 2: Corrección μ-law
- Cambio a decodificación μ-law obligatoria
- Resultado: Solo ruido estático

### Iteración 3: Cambio a PCM
- PCM 16-bit @ 24kHz
- Resultado: Voz de ardilla

### Iteración 4: Ajuste de Sample Rate
- PCM 16-bit @ 16kHz
- Resultado: Agente suena bien, humano distorsionado

### Iteración 5: Audio Estéreo
- Separación de canales intercalados
- Ambos canales audibles pero humano muy bajo

### Iteración 6: Ganancia por Canal
- LEFT_GAIN: 1.0 (Agente IA)
- RIGHT_GAIN: 6.0 (Humano amplificado)
- Resultado: ✅ Audio correcto

### Iteración 7: Sistema de Buffering
- Buffer de 3 chunks antes de reproducir
- Scheduling preciso con AudioContext
- Resultado: ✅ Sin cortes

### Iteración 8: Controles de Usuario
- Sliders de volumen por canal
- Persistencia en localStorage
- UI con indicadores visuales

---

## 🎛️ Controles de Usuario

### UI del Footer del Modal

1. **Botón Escuchar/Detener**: Inicia/detiene la conexión WebSocket
2. **Icono de Ondas**: Muestra/oculta controles avanzados
3. **Control IA (azul)**: Slider 0-300% para canal izquierdo
4. **Control Humano (verde)**: Slider 0-1000% para canal derecho
5. **Volumen Master**: Control general 0-200%

---

## 🔧 Código Clave

### Separación de Canales Estéreo

```typescript
for (let i = 0; i < samplesPerChannel; i++) {
  // Canal izquierdo (Agente IA) - samples pares
  let leftSample = (pcmSamples[i * 2] / 32768.0) * currentLeftGain;
  // Canal derecho (Humano) - samples impares
  let rightSample = (pcmSamples[i * 2 + 1] / 32768.0) * currentRightGain;
  
  // Soft clipping
  leftSample = Math.max(-0.98, Math.min(0.98, leftSample));
  rightSample = Math.max(-0.98, Math.min(0.98, rightSample));
  
  leftChannel[i] = leftSample;
  rightChannel[i] = rightSample;
}
```

### Scheduling Preciso

```typescript
const scheduleAudioPlayback = (audioBuffer: AudioBuffer) => {
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode);
  
  const now = ctx.currentTime;
  const startTime = Math.max(now, nextPlayTimeRef.current);
  
  source.start(startTime);
  nextPlayTimeRef.current = startTime + audioBuffer.duration;
};
```

---

## 🔄 Rollback

Si es necesario revertir los cambios:

```bash
# Volver al estado anterior
git checkout v4.2.1-pre-audio-monitor

# O revertir solo el archivo
git checkout v4.2.1-pre-audio-monitor -- src/components/dashboard/widgets/ActiveCallDetailModal.tsx
```

---

## 📊 Métricas de Rendimiento

| Métrica | Valor |
|---------|-------|
| Latencia inicial | ~60ms (buffer de 3 chunks) |
| Sample rate | 16,000 Hz |
| Bits por sample | 16 |
| Canales | 2 (estéreo) |
| Chunk típico | ~640 bytes (20ms de audio) |

---

## 🐛 Problemas Conocidos y Soluciones

### Problema: Voz de "secuestrador" (grave y distorsionada)
**Causa**: Sample rate incorrecto (muy bajo)
**Solución**: Usar 16kHz

### Problema: Voz de "ardilla" (aguda y rápida)
**Causa**: Sample rate incorrecto (muy alto)
**Solución**: Usar 16kHz

### Problema: Ruido estático
**Causa**: Decodificación μ-law en audio PCM
**Solución**: Usar PCM directo sin decodificación

### Problema: Micro-cortes en el audio
**Causa**: Gaps entre reproducción de chunks
**Solución**: Sistema de buffering con scheduling preciso

### Problema: Canal del humano muy bajo
**Causa**: Audio telefónico tiene menor amplitud
**Solución**: Amplificación 6x para canal derecho

---

## 📚 Referencias

- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioContext.createBuffer()](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer)
- [AudioBufferSourceNode.start()](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start)
- VAPI Documentation (interno)

---

## ✅ Checklist de Validación

- [x] Audio del Agente IA se escucha claramente
- [x] Audio del Humano se escucha claramente
- [x] No hay cortes ni gaps en el audio
- [x] Controles de volumen funcionan en tiempo real
- [x] Preferencias se guardan en localStorage
- [x] El botón aparece solo en llamadas activas con monitor_url
- [x] La conexión se limpia al cerrar el modal
- [x] Mensajes de error informativos

---

*Documento generado el 10 de Diciembre 2025*

