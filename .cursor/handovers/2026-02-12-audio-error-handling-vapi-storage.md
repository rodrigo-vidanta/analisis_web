# Handover: Audio Error Handling + Diagnostico VAPI Storage

**Fecha:** 2026-02-12
**Trigger:** Osmara Partida no puede escuchar grabaciones de audio en Prospectos
**Estado:** Implementado, pendiente deploy

---

## Problema Reportado

La ejecutiva **Osmara Partida** (`osmarapartida@vidavacations.com`) al abrir un prospecto en la seccion de Prospectos no puede reproducir el audio de las llamadas. Errores en consola:

```
storage.vapi.ai/019c5295-a130-...-mono.wav: Failed to load resource: net::ERR_CONNECTION_RESET
NotSupportedError: The element has no supported sources.
```

## Diagnostico Completo

### Datos del caso
- **Call ID:** `019c5295-a130-733b-9c4e-7684ec274255`
- **Prospecto:** Javier Cruz (`ad62d0b0-ee36-4127-ad8b-376c4db8e9f3`)
- **Llamada:** 2026-02-12 16:02, transferida, 74 seg
- **URL audio:** `https://storage.vapi.ai/019c5295-a130-...-mono.wav`

### Hallazgos

1. **El archivo SI existe** - HTTP HEAD desde servidor devuelve 200 OK, 2.37 MB, `audio/wav`
2. **VAPI NO purga audios** - El mas antiguo (Nov 2025) tambien responde 200 OK
3. **CORS correctamente configurado** - Preflight devuelve `access-control-allow-origin: *`
4. **1,440 grabaciones en BD** - TODAS son `https://storage.vapi.ai/...` (no hay GCS)
5. **`ERR_CONNECTION_RESET`** es error a nivel TCP, no HTTP - apunta a firewall/proxy corporativo
6. **Solo afecta a Osmara** - otros usuarios no reportan el problema

### Causa Raiz

El firewall corporativo de Vida Vacations bloquea conexiones al dominio `storage.vapi.ai`. El error `ERR_CONNECTION_RESET` ocurre a nivel TCP antes de intercambiar datos HTTP.

Se genero mensaje para equipo de telecom con dominios a liberar:
- `storage.vapi.ai` (critico, audio grabaciones)
- `glsmifhkoaifvaegsozd.supabase.co` (API, auth, realtime)
- `primary-dev-d75a.up.railway.app` (webhooks N8N)
- `api.elevenlabs.io` (voz AI)
- `api.mymemory.translated.net` (traduccion)

## Cambios Implementados

### Audio Error Handling en 5 componentes

Antes: si el audio fallaba, el reproductor quedaba en estado "cargando" o silenciosamente no hacia nada. No habia feedback visual.

Despues: se muestra mensaje de error con boton "Reintentar":
```
[!] No se pudo cargar el audio. Verifique su conexion a internet. [Reintentar]
```

#### Archivos modificados:

| Archivo | Linea clave | Tipo de cambio |
|---------|-------------|----------------|
| `src/components/chat/CallDetailModalSidebar.tsx` | ~1177 | Estado `audioError` + ternario error/controles + `onError` en `<audio>` |
| `src/components/chat/CallDetailModal.tsx` | ~342 | Estado `audioError` + ternario error/audio nativo |
| `src/components/analysis/LiveMonitor.tsx` | ~1477, ~1941 | Estado `audioError` en FinishedCallModal subcomponent |
| `src/components/analysis/LiveMonitorKanban.tsx` | ~241, ~4960 | Estado `recordingError` (renombrado para evitar conflicto con `audioError` preexistente de live audio) |
| `src/components/analysis/AnalysisIAComplete.tsx` | ~728, ~963 | `audioError` en AudioPlayerInline + `audioErrorId` en tabla de llamadas |

### Detalle tecnico del patron

```tsx
// Estado
const [audioError, setAudioError] = useState(false);

// En <audio> element
onError={() => setAudioError(true)}

// UI condicional
{audioError ? (
  <div className="...error-banner...">
    <span>No se pudo cargar el audio...</span>
    <button onClick={() => { setAudioError(false); audioRef.current?.load(); }}>
      Reintentar
    </button>
  </div>
) : (
  <audio ...> /* reproductor normal */ </audio>
)}
```

### Nota sobre LiveMonitorKanban

El archivo ya tenia un estado `audioError` (tipo `string | null`) para el monitoreo de audio en tiempo real (WebSocket). Para evitar conflicto de nombres en el mismo scope, el nuevo estado se llamo `recordingError`.

## Flujo de Audio en la Plataforma

```
llamadas_ventas.audio_ruta_bucket
  |
  +--> URL tipo "https://storage.vapi.ai/..." (1,440 registros, desde Nov 2025)
  |     |
  |     +--> CallDetailModalSidebar (Prospectos) - <audio src={url}>
  |     +--> CallDetailModal (LiveChat) - <audio><source src={url}></audio>
  |     +--> LiveMonitor - <audio><source src={url}></audio>
  |     +--> LiveMonitorKanban - <audio><source src={url}></audio>
  |     +--> AnalysisIAComplete - new Audio(url) + AudioPlayerInline
  |
  +--> URL tipo "gs://..." (0 registros actualmente)
        |
        +--> AudioPlayer.tsx -> audioService.ts -> Edge Function generar-url-optimizada
             (para Google Cloud Storage, NO usado actualmente)
```

**Importante:** NO existe proxy para `storage.vapi.ai`. El browser descarga el audio directamente. Si el firewall sigue bloqueando despues de la solicitud, considerar crear un proxy Edge Function similar a `generar-url-optimizada`.

## Build

- TypeScript: compilacion limpia (`npx tsc --noEmit` sin errores)
- Vite build: exitoso en 16.82s
- Solo warning preexistente de chunk size (index.js ~9.3MB)

## Tambien se removio

- `volume={audioVolume}` de `CallDetailModalSidebar.tsx` linea ~1300 - no es atributo HTML valido en `<audio>`, causaba error TS. El volumen ya se controla programaticamente via `audioRef.current.volume`.

## Pendiente

- [ ] Deploy a produccion
- [ ] Confirmacion de telecom que liberaron `storage.vapi.ai`
- [ ] Verificar con Osmara que el audio funciona despues de la liberacion
