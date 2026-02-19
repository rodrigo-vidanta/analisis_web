# Handover: Audio Multi-Dispositivo para Notificaciones

**Fecha:** 2026-02-19
**Estado:** Implementado, pendiente deploy

---

## Problema

Los ejecutivos del call center tienen 2 salidas de audio: bocina integrada en el CPU y auriculares (siempre conectados). Las notificaciones de la plataforma solo sonaban por el dispositivo predeterminado del navegador (generalmente los auriculares). Cuando no los traian puestos, nunca se enteraban de llamadas o mensajes nuevos.

## Solucion

Se creo un servicio centralizado que reproduce sonidos de notificacion en **TODOS** los dispositivos de salida simultaneamente usando la API `HTMLMediaElement.setSinkId()` (Chrome 110+). Se unifico la logica de audio de 3 sistemas independientes que tenian codigo duplicado.

---

## Arquitectura antes vs despues

### ANTES: 3 sistemas independientes, codigo duplicado

```
notificationSoundService.ts  →  new Audio().play()  →  default device
notificationStore.ts          →  new Audio().play()  →  default device  (55 lineas duplicadas)
liveActivityStore.ts          →  new Audio().play()  →  default device  (25 lineas duplicadas)
```

### DESPUES: Servicio centralizado, zero duplicacion

```
notificationSoundService.ts  ─┐
notificationStore.ts          ├→  audioOutputService.playOnAllDevices()  →  ALL devices
liveActivityStore.ts          ─┘
```

---

## Archivos creados

| Archivo | Proposito |
|---------|-----------|
| `src/services/audioOutputService.ts` | Singleton: enumera devices, setSinkId, playOnAllDevices(), autoplay unlock, hot-plug, preferences |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/services/notificationSoundService.ts` | Import audioOutputService, reemplazar `new Audio().play()` con `playOnAllDevices()`. Fix `any` → `unknown` en webkitAudioContext |
| `src/stores/notificationStore.ts` | Eliminadas ~55 lineas de audio duplicado (initAudio, unlockAudio, event listeners). Reemplazado con 5 lineas usando audioOutputService |
| `src/stores/liveActivityStore.ts` | Eliminadas ~25 lineas de audio duplicado (initAudio, notificationAudio). Reemplazado con 5 lineas usando audioOutputService |
| `src/components/dashboard/NotificationControl.tsx` | Nuevo toggle "Todos los dispositivos" con badge conteo, handler requestDeviceAccess, test buttons ahora usan audioOutputService |

---

## Detalle tecnico: `audioOutputService.ts`

### API publica

| Metodo | Descripcion |
|--------|-------------|
| `playOnAllDevices(url, volume)` | Crea N Audio elements con `setSinkId` diferente, `Promise.allSettled` |
| `playOnDefaultDevice(url, volume)` | Fallback single device (comportamiento original) |
| `isMultiDeviceEnabled()` | Lee preferencia + feature detection |
| `setMultiDeviceEnabled(bool)` | Persiste en localStorage, si true pide permiso mic |
| `isSupported()` | Feature detection de `setSinkId` |
| `requestDeviceAccess()` | `getUserMedia({audio:true})` para obtener labels, stop track inmediato |
| `refreshDevices()` | Re-enumera dispositivos (llamado en hot-plug) |
| `getDevices()` | Lista de `{deviceId, label}` |
| `getDeviceCount()` | Cantidad de dispositivos reales |
| `onDeviceChange(listener)` | Callback para hot-plug, retorna unsubscribe |
| `getPreferences()` | `{multiDeviceEnabled: boolean}` |

### Filtrado de pseudo-devices

`navigator.mediaDevices.enumerateDevices()` retorna devices reales + aliases:
- `deviceId: 'default'` → alias del device predeterminado del sistema
- `deviceId: 'communications'` → alias del device de comunicaciones (Windows)
- `deviceId: ''` → device sin ID

Si no se filtran, el sonido se duplica en el mismo dispositivo fisico. El servicio filtra estos y solo mantiene devices reales. Si despues del filtro queda 0 → agrega fallback `{deviceId: '', label: 'Dispositivo predeterminado'}`.

### Autoplay unlock

Registra listeners `click`, `keydown`, `touchstart` en document. En la primera interaccion, reproduce un data URI WAV silencioso para desbloquear autoplay. Remueve listeners despues del unlock exitoso. Esto centraliza el unlock que antes estaba duplicado en `notificationStore.ts`.

### Preferencias

- **Key localStorage:** `dashboard-audio-output-preferences`
- **Estructura:** `{ multiDeviceEnabled: boolean }`
- **Default:** `multiDeviceEnabled: false` (comportamiento identico al anterior)

---

## UI: NotificationControl

Se agrego una nueva fila en el dropdown de notificaciones, entre la seccion "Sonidos" y "Notificaciones del Sistema":

```
┌──────────────────────────────────────┐
│  🔊 Sonidos                 [Activos]│
│  ├ 💬 Mensajes nuevos    🔊 [━━━●]  │
│  └ 📞 Llamadas activas   🔊 [━━━●]  │
│  ─────────────────────────────────── │
│  🖥️ Todos los dispositivos  [2] [●] │ ← NUEVO
│     Bocinas y audifonos              │
│  ═══════════════════════════════════ │
│  🔔 Notificaciones del Sistema      │
│  ...                                │
└──────────────────────────────────────┘
```

### Comportamiento del toggle
1. **Primera activacion:** Solicita permiso de microfono (necesario para obtener labels de `enumerateDevices`). Si deniegan → toggle no se activa.
2. **Activado:** Badge azul muestra cantidad de dispositivos detectados. Todas las notificaciones se reproducen en todos los devices.
3. **Desactivado:** Comportamiento original (single device default).
4. **Sonidos globales OFF:** Toggle disabled con opacidad reducida.
5. **Browser sin setSinkId:** Toggle no aparece (feature detection).
6. **Hot-plug:** Si conectan/desconectan auriculares, badge se actualiza automaticamente via `devicechange` event.

### Imports agregados
- `Monitor` de lucide-react (icono para la fila)
- `audioOutputService` + tipo `AudioOutputDevice`

---

## Sonidos del sistema cubiertos

| Sonido | Archivo | Origen | Cubierto |
|--------|---------|--------|----------|
| Notificacion mensaje | `/sounds/notification-message.mp3` | notificationSoundService | SI |
| Notificacion llamada | `/sounds/notification-call.mp3` | notificationSoundService | SI |
| Notificacion generica BD | `/sounds/notification.mp3` | notificationStore | SI |
| Nueva llamada activa | `/sounds/notification.mp3` | liveActivityStore | SI |
| Test buttons UI | notification-call/message.mp3 | NotificationControl | SI |
| Fallback oscillator | AudioContext (1200Hz sine) | notificationSoundService | Solo default device (caso raro) |
| Logos estacionales | christmas-jingle, etc. | ChristmasLogo, etc. | NO (user-initiated, no notificacion) |
| Login success | citas-login-success.mp3 | CitasLoginScreen | NO (user-initiated) |
| Voice previews | URLs externas | VoiceModelsSection | NO (content playback) |
| Call recordings | GCS signed URLs | AudioPlayer | NO (content playback) |

---

## Compatibilidad

| Navegador | setSinkId | enumerateDevices | Estado |
|-----------|:---------:|:----------------:|--------|
| Chrome 110+ | SI | SI | Full support |
| Edge 110+ | SI | SI | Full support |
| Firefox | NO | SI | Toggle no aparece, fallback a default |
| Safari | NO | SI | Toggle no aparece, fallback a default |

Los ejecutivos del call center usan Chrome → full support.

---

## Lecciones aprendidas

1. **Pseudo-devices causan duplicacion:** `enumerateDevices()` retorna `default` + `communications` como aliases. Sin filtrarlos, el sonido se reproduce 2-3 veces en el mismo dispositivo fisico.

2. **getUserMedia necesario para labels:** Sin pedir permiso de microfono, `enumerateDevices()` retorna devices con labels vacios y deviceIds vacios. El permiso de mic es one-time y el stream se cierra inmediatamente.

3. **3 sistemas de audio duplicados:** La plataforma tenia 3 implementaciones independientes de `new Audio().play()` con codigo repetido (init, unlock, play). La centralizacion en `audioOutputService` elimino ~80 lineas de duplicacion y unifica el comportamiento.

4. **Promise.allSettled vs Promise.all:** Usar `allSettled` es critico para que un device que falle (ej: desconectado durante playback) no bloquee el sonido en los demas.

5. **setSinkId en AudioContext:** Existe `AudioContext.setSinkId()` (Chrome 110+) pero NO esta en los tipos TypeScript de DOM. Para el fallback oscillator se mantiene en default device para evitar type augmentation innecesaria.

---

## Verificacion

- [x] `npx tsc --noEmit` → 0 errores
- [x] `npm run build` → exitoso (18.74s)
- [ ] Test manual: toggle ON con 2+ devices, sonido en ambos
- [ ] Test manual: toggle OFF, solo default device
- [ ] Test manual: hot-plug (conectar/desconectar auriculares)
- [ ] Test manual: permission denied → toggle no se activa
- [ ] Deploy a produccion
