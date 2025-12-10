# Implementación de Monitoreo de Audio en Tiempo Real

## 📋 Descripción General

Esta documentación describe la implementación del sistema de monitoreo de audio en tiempo real para llamadas activas en la plataforma PQNC QA AI. El sistema permite escuchar las llamadas en curso a través de WebSocket, con controles de volumen independientes para cada canal (IA y Humano).

## 🎯 Funcionalidad

- **Escucha en tiempo real** de llamadas activas vía WebSocket
- **Separación de canales**: IA (canal derecho) y Humano (canal izquierdo)
- **Controles de volumen independientes** por canal
- **Persistencia de preferencias** en localStorage
- **Sistema de buffering** para reproducción fluida sin cortes

## 🔧 Configuración Técnica

### Formato de Audio
- **Formato**: PCM 16-bit signed little-endian estéreo intercalado
- **Sample Rate**: 16kHz
- **Canales**: 2 (estéreo)
  - Canal Izquierdo: **Humano/Cliente**
  - Canal Derecho: **Agente IA**

### Configuración de Volumen

```typescript
const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  MIN_CHUNK_SIZE: 320,
  DEFAULT_VOLUME: 1.0,
  DEFAULT_HUMAN_SLIDER: 5,  // ~522%
  DEFAULT_IA_SLIDER: 5,     // 50%
  LATENCY_HINT: 'interactive',
  STORAGE_KEY_HUMAN: 'pqnc_audio_human_slider',
  STORAGE_KEY_IA: 'pqnc_audio_ia_slider',
};
```

### Escalas de Volumen

| Canal | Slider | Rango Real | Fórmula |
|-------|--------|------------|---------|
| **IA** | 0-10 | 0%-100% | `slider * 0.1` |
| **Humano** | 1-10 | 300%-800% | `3.0 + (slider-1) * (5.0/9)` |

#### Tabla de Conversión - Humano
| Slider | Multiplicador | Porcentaje |
|--------|---------------|------------|
| 1 | 3.00x | 300% |
| 2 | 3.56x | 356% |
| 3 | 4.11x | 411% |
| 4 | 4.67x | 467% |
| 5 | 5.22x | 522% |
| 6 | 5.78x | 578% |
| 7 | 6.33x | 633% |
| 8 | 6.89x | 689% |
| 9 | 7.44x | 744% |
| 10 | 8.00x | 800% |

#### Tabla de Conversión - IA
| Slider | Multiplicador | Porcentaje |
|--------|---------------|------------|
| 0 | 0.00x | 0% |
| 5 | 0.50x | 50% |
| 10 | 1.00x | 100% |

## 📁 Archivos Modificados

### 1. `src/components/dashboard/widgets/ActiveCallDetailModal.tsx`
Modal de detalle de llamadas activas en el Dashboard.

**Cambios principales:**
- Añadida configuración `AUDIO_CONFIG`
- Implementadas funciones de conversión de slider a ganancia
- Estados para sliders de volumen (`humanSlider`, `iaSlider`)
- Refs para Web Audio API (`audioContextRef`, `gainNodeRef`, etc.)
- Funciones de audio: `initAudioContext`, `scheduleAudioPlayback`, `processBufferQueue`, `processAudioChunk`
- Funciones de control: `startAudioMonitoring`, `stopAudioMonitoring`, `toggleAudioMonitoring`
- UI con botón "Escuchar" y controles de volumen desplegables

### 2. `src/components/analysis/LiveMonitorKanban.tsx`
Módulo AI Call Monitor con Kanban de llamadas.

**Cambios principales:**
- Misma lógica de audio que ActiveCallDetailModal
- Integración en el modal de detalle de llamadas activas
- Botón "Escuchar Llamada" con controles de volumen
- Cleanup automático al cerrar modal

## 🔄 Flujo de Audio

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   VAPI Server   │────▶│   WebSocket  │────▶│  ArrayBuffer    │
│  (monitor_url)  │     │  (binario)   │     │  (PCM 16-bit)   │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Speakers      │◀────│  AudioBuffer │◀────│ processAudio    │
│   (estéreo)     │     │  (2 canales) │     │ Chunk()         │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

## 🎛️ Sistema de Buffering

Para evitar cortes en el audio, se implementó un sistema de buffering con scheduling preciso:

```typescript
const BUFFER_THRESHOLD = 3; // Chunks mínimos antes de reproducir

// Acumular chunks iniciales
if (isBufferingRef.current) {
  audioBufferQueueRef.current.push(audioBuffer);
  if (audioBufferQueueRef.current.length >= BUFFER_THRESHOLD) {
    isBufferingRef.current = false;
    nextPlayTimeRef.current = ctx.currentTime + 0.05;
    processBufferQueue();
  }
} else {
  scheduleAudioPlayback(audioBuffer);
}
```

## 🐛 Problemas Resueltos

### 1. Audio Distorsionado ("voz de secuestrador")
- **Causa**: Sample rate incorrecto
- **Solución**: Ajustado a 16kHz (formato nativo de VAPI)

### 2. Canales Invertidos
- **Causa**: Asignación incorrecta de canales
- **Solución**: Canal Izquierdo = Humano, Canal Derecho = IA

### 3. Cortes en el Audio
- **Causa**: Reproducción inmediata sin buffering
- **Solución**: Sistema de buffering con scheduling preciso usando `AudioContext.currentTime`

### 4. Volumen del Humano muy bajo
- **Causa**: Ganancia insuficiente
- **Solución**: Rango de 300%-800% (mínimo 3x, máximo 8x)

## 💾 Persistencia

Las preferencias de volumen se guardan en `localStorage`:

```javascript
// Guardar
localStorage.setItem('pqnc_audio_human_slider', humanSlider.toString());
localStorage.setItem('pqnc_audio_ia_slider', iaSlider.toString());

// Recuperar
const humanSlider = parseFloat(localStorage.getItem('pqnc_audio_human_slider') || '5');
const iaSlider = parseFloat(localStorage.getItem('pqnc_audio_ia_slider') || '5');
```

## 🔒 Cleanup

Al cerrar el modal o detener el monitoreo:

```typescript
const stopAudioMonitoring = useCallback(() => {
  // Cerrar WebSocket
  if (audioWebSocketRef.current) {
    audioWebSocketRef.current.close(1000, 'Usuario detuvo el monitoreo');
    audioWebSocketRef.current = null;
  }
  
  // Cerrar AudioContext
  if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
    audioContextRef.current.close();
    audioContextRef.current = null;
  }
  
  gainNodeRef.current = null;
  setIsListening(false);
  setIsAudioPlaying(false);
  setAudioError(null);
}, []);
```

## 📱 UI Components

### Botón de Escuchar
```tsx
<motion.button
  onClick={() => toggleAudioMonitoring(monitorUrl)}
  className={isListening 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'bg-gradient-to-r from-emerald-600 to-teal-600'
  }
>
  {isListening ? <VolumeX /> : <Headphones />}
  {isListening ? 'Detener Audio' : 'Escuchar Llamada'}
</motion.button>
```

### Controles de Volumen
```tsx
{/* IA: 0-10, donde 5 = 50% */}
<input type="range" min="0" max="10" step="1" value={iaSlider} />

{/* Humano: 1-10, donde 1=300%, 10=800% */}
<input type="range" min="1" max="10" step="1" value={humanSlider} />
```

## 📊 Versión

- **Versión**: B4.3.0N6.0.0
- **Fecha**: Diciembre 2024
- **Autor**: Desarrollo PQNC AI Platform

## 🔗 Referencias

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [VAPI Documentation](https://docs.vapi.ai/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
