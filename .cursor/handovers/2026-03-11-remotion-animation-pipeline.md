# Handover: Pipeline de Animaciones con Remotion + ElevenLabs TTS

**Fecha:** 2026-03-11
**Contexto:** Creacion de animacion "Llamadas WhatsApp" como comunicado interactivo
**Proposito:** Documentar el proceso completo para replicar en futuras animaciones (ej: "Llamadas Outbound")

---

## 1. Arquitectura General

```
ElevenLabs TTS API ──► Audio narration (.mp3)
                          │
                          ▼
Remotion Player ◄──── React Components (7 scenes)
  (browser)               │
                          ▼
Remotion CLI ─────► MP4 Export (H.264)
  (CLI render)
```

**Dos modos de uso:**
- **Browser (`@remotion/player`):** Reproduce la animacion en el overlay de comunicados. Audio via `<audio>` refs con sync manual.
- **CLI (`@remotion/cli` + `@remotion/renderer`):** Exporta a MP4. Audio via `<Audio>` component de Remotion (embebido en composicion).

---

## 2. Paquetes Instalados

```json
{
  "@remotion/player": "^4.0.0",
  "@remotion/cli": "^4.0.0",
  "@remotion/renderer": "^4.0.0",
  "remotion": "^4.0.0"
}
```

> **Nota:** `@remotion/cli` y `@remotion/renderer` solo se necesitan para exportar MP4. Para browser-only, solo `@remotion/player` + `remotion`.

---

## 3. ElevenLabs TTS — Generacion de Audio

### Credenciales

- **API Key:** `99a21e3b5a1bfcc899de31f169492d37f2f448d5a94a71a1e3c457dbece28c17`
- **Voice ID:** `rEVYTKPqwSMhytFPayIb` (voz masculina, español neutro)
- **Model:** `eleven_v3` (ultimo modelo, mejor calidad)

### Endpoint: Generacion con Timestamps

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/rEVYTKPqwSMhytFPayIb/with-timestamps" \
  -H "xi-api-key: 99a21e3b5a1bfcc899de31f169492d37f2f448d5a94a71a1e3c457dbece28c17" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "El texto de la narracion aqui...",
    "model_id": "eleven_v3",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }'
```

**Respuesta:** JSON con `audio_base64` (MP3) + `alignment` (word-level timestamps):
```json
{
  "audio_base64": "//uQxAAAAAAA...",
  "alignment": {
    "characters": ["P","r","e","s","e","n","t","a","m","o","s"],
    "character_start_times_seconds": [0.0, 0.05, 0.09, ...],
    "character_end_times_seconds": [0.05, 0.09, 0.14, ...]
  }
}
```

### Endpoint: Solo Audio (sin timestamps)

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/rEVYTKPqwSMhytFPayIb" \
  -H "xi-api-key: 99a21e3b5a1bfcc899de31f169492d37f2f448d5a94a71a1e3c457dbece28c17" \
  -H "Content-Type: application/json" \
  --output output.mp3 \
  -d '{
    "text": "Texto...",
    "model_id": "eleven_v3",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }'
```

### Guardar audio desde base64

```bash
echo "BASE64_STRING" | base64 -d > public/sounds/vo-narration.mp3
```

---

## 4. Speech Script — Llamadas WhatsApp (v1)

Este es el guion de narracion utilizado para la animacion `voice-calls-intro`. Guardarlo para dar continuidad en futuras animaciones.

```
Presentamos... Llamadas WhatsApp.

Ahora, cuando un prospecto quiere llamarnos, puede hacerlo directamente desde WhatsApp. Sin descargar nada. Sin marcar otro número.

Nuestra inteligencia artificial recibe la llamada, procesa la conversación, y la transfiere automáticamente al ejecutivo asignado.

Tú contestas directamente desde tu navegador. Un softphone integrado en la plataforma, con controles de audio, mute, y transferencia.

Y si necesitas apoyo, transfiere la llamada a cualquier miembro de tu coordinación, con un solo click. Supervisores, coordinadores, o compañeros ejecutivos.

Contesta desde tu navegador sin apps adicionales. Transfiere con un click. Y cada llamada se graba automáticamente para tu respaldo. Disponible ahora.

Próximamente... llamadas outbound. Llama a tus prospectos directamente desde la plataforma.
```

### Timestamps STT (word-level boundaries por parrafo)

| Parrafo / Escena | Inicio (s) | Fin (s) | Frames @30fps |
|---|---|---|---|
| INTRO: "Presentamos... Llamadas WhatsApp." | 0.00 | 3.11 | 0–93 |
| WHATSAPP: "Ahora, cuando un prospecto..." | 3.11 | 11.96 | 93–359 |
| AI: "Nuestra inteligencia artificial..." | 11.96 | 19.54 | 359–587 |
| SOFTPHONE: "Tú contestas directamente..." | 19.54 | 29.36 | 587–882 |
| TRANSFER: "Y si necesitas apoyo..." | 29.36 | 39.25 | 882–1179 |
| OUTRO: "Contesta desde tu navegador..." | 39.25 | 49.90 | 1179–1499 |
| POSTCREDITS: "Próximamente... plataforma." | 49.90 | 56.34 | 1499–1740 |

**Formula:** `frame = Math.round(segundos * 30)`

---

## 5. Workflow: De Speech a Animacion Sincronizada

### Paso 1: Escribir el speech script
- Un parrafo por escena
- Ritmo natural, pausas entre parrafos (ElevenLabs las respeta)
- ~55-60 segundos total para 7 escenas

### Paso 2: Generar audio con timestamps
```bash
# Usar endpoint with-timestamps para obtener alignment data
curl -X POST ".../with-timestamps" ... > response.json

# Extraer audio
cat response.json | jq -r '.audio_base64' | base64 -d > public/sounds/vo-narration.mp3

# Extraer timestamps (analizar manualmente los boundaries entre parrafos)
cat response.json | jq '.alignment'
```

### Paso 3: Identificar boundaries entre parrafos
- Buscar timestamps donde termina la ultima palabra de un parrafo
- Buscar timestamps donde empieza la primera palabra del siguiente
- Esos son los boundaries de las escenas

### Paso 4: Configurar SCENES en el componente
```typescript
const FPS = 30;
const SCENES = {
  INTRO:       { from: 0,    dur: 93 },    // boundary 0 → 3.11s
  WHATSAPP:    { from: 93,   dur: 266 },   // boundary 3.11s → 11.96s
  // ... etc
};
const TOTAL_FRAMES = sum(all dur); // debe cubrir todo el audio
```

### Paso 5: Ajustar animaciones internas
- Elementos que aparecen dentro de cada escena deben usar frames relativos
- Ejemplo: si "DISPONIBLE AHORA" se narra en el segundo 47.5 de la escena OUTRO, calcular frame relativo dentro de esa escena

---

## 6. Estructura de Archivos

```
src/components/comunicados/tutorials/
  VoiceCallsIntroTutorial.tsx    ← Componente principal (Player browser)

src/remotion/
  index.tsx                       ← Entry point para CLI render (MP4 export)

public/sounds/
  voice-calls-intro.mp3           ← Musica de fondo (loop, vol 0.15)
  vo-narration.mp3                ← Narracion continua (vol 0.85)

out/
  voice-calls-whatsapp.mp4        ← MP4 exportado
```

---

## 7. Componente Browser (Player)

### Dual Audio System

El `@remotion/player` NO soporta `<Audio>` de Remotion. Se usa `<audio>` HTML nativo con sync manual:

```typescript
const musicRef = useRef<HTMLAudioElement>(null);
const narrationRef = useRef<HTMLAudioElement>(null);

// En el frame update callback del Player:
playerRef.current?.addEventListener('frameupdate', (e) => {
  const videoTime = e.detail.frame / FPS;

  // Sync narration con drift correction
  const narrationTime = narrationRef.current.currentTime;
  if (Math.abs(videoTime - narrationTime) > 0.3 && !narrationRef.current.paused) {
    narrationRef.current.currentTime = videoTime;
  }
});

// Play/pause sync
playerRef.current?.addEventListener('play', () => {
  musicRef.current?.play();
  narrationRef.current?.play();
});
playerRef.current?.addEventListener('pause', () => {
  musicRef.current?.pause();
  narrationRef.current?.pause();
});
```

### Registro en Overlay

```typescript
// ComunicadoOverlay.tsx
const INTERACTIVE_REGISTRY = {
  'voice-calls-intro': lazy(() => import('./tutorials/VoiceCallsIntroTutorial')),
  // agregar nuevas animaciones aqui
};
```

### Registro en Tipos

```typescript
// src/types/comunicados.ts → INTERACTIVE_COMUNICADOS array
{
  component_key: 'voice-calls-intro',
  label: 'Llamadas WhatsApp',
  description: 'Tutorial interactivo de llamadas WhatsApp',
}
```

---

## 8. Exportar a MP4 (Remotion CLI)

### Entry Point (`src/remotion/index.tsx`)

A diferencia del componente browser, el entry point de Remotion CLI:
- USA `<Audio>` de Remotion (no refs HTML)
- Requiere `registerRoot()` al final del archivo
- Duplica los componentes de escena (no importa del tutorial porque las dependencias difieren)

```typescript
import { registerRoot, Composition, Audio, staticFile } from 'remotion';

const MyComposition = () => (
  <AbsoluteFill>
    <Audio src={staticFile('sounds/voice-calls-intro.mp3')} volume={0.15} />
    <Audio src={staticFile('sounds/vo-narration.mp3')} volume={0.85} />
    {/* Sequences con escenas */}
  </AbsoluteFill>
);

const Root = () => (
  <Composition
    id="VoiceCallsWhatsApp"
    component={MyComposition}
    durationInFrames={1740}
    fps={30}
    width={1060}
    height={650}
  />
);

registerRoot(Root);
```

### Comando de Render

```bash
npx remotion render src/remotion/index.tsx VoiceCallsWhatsApp out/voice-calls-whatsapp.mp4 \
  --codec=h264 \
  --log=verbose
```

**Parametros:**
- `src/remotion/index.tsx` — entry point con registerRoot
- `VoiceCallsWhatsApp` — ID de la Composition
- `out/voice-calls-whatsapp.mp4` — archivo de salida
- `--codec=h264` — codec de video (default)

**Tiempo de render:** ~2-3 minutos para 1740 frames (58s a 30fps)

---

## 9. Patron de Escenas (Template)

Cada escena sigue este patron Remotion:

```typescript
const MyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Scene label (titulo de la escena) */}
      <motion.div style={{
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <span>TITULO DE LA ESCENA</span>
      </motion.div>

      {/* Subtitle (aparece despues del label) */}
      <motion.div style={{
        opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <span>Subtitulo descriptivo</span>
      </motion.div>

      {/* Contenido animado de la escena */}
      {/* ... */}
    </AbsoluteFill>
  );
};
```

### Composicion con Sequences

```typescript
<Sequence from={SCENES.INTRO.from} durationInFrames={SCENES.INTRO.dur}>
  <IntroScene />
</Sequence>
<Sequence from={SCENES.WHATSAPP.from} durationInFrames={SCENES.WHATSAPP.dur}>
  <WhatsAppScene />
</Sequence>
{/* ... */}
```

---

## 10. Publicacion como Comunicado

### INSERT en BD (tras deploy)

```sql
INSERT INTO comunicados (
  titulo, subtitulo, contenido, tipo, prioridad,
  is_interactive, component_key, target_type, target_ids,
  estado, published_at, created_by
)
VALUES (
  'Llamadas WhatsApp',
  'Nueva funcionalidad de llamadas',
  '{}'::jsonb,
  'feature',
  8,
  true,
  'voice-calls-intro',
  'todos',
  '{}',
  'activo',
  NOW(),
  'e8ced62c-3fd0-4328-b61a-a59ebea2e877'
)
RETURNING id, titulo, estado;
```

### Re-publicar (reset reads)

```sql
-- Borrar todas las lecturas para que todos lo vean de nuevo
DELETE FROM comunicado_reads WHERE comunicado_id = 'UUID_DEL_COMUNICADO';

-- Reactivar si es necesario
UPDATE comunicados SET
  estado = 'activo',
  target_type = 'todos',
  target_ids = '{}',
  published_at = NOW()
WHERE id = 'UUID_DEL_COMUNICADO';
```

---

## 11. Checklist para Nueva Animacion

- [ ] Escribir speech script (~55-60s, un parrafo por escena)
- [ ] Generar audio con ElevenLabs `with-timestamps` endpoint
- [ ] Guardar audio en `public/sounds/`
- [ ] Analizar timestamps STT para definir boundaries de escenas
- [ ] Crear componente en `src/components/comunicados/tutorials/NuevoTutorial.tsx`
- [ ] Configurar SCENES con frames calculados de timestamps
- [ ] Implementar dual audio (music ref + narration ref) con drift correction
- [ ] Registrar en `ComunicadoOverlay.tsx` → INTERACTIVE_REGISTRY
- [ ] Registrar en `src/types/comunicados.ts` → INTERACTIVE_COMUNICADOS
- [ ] Build (`npm run build`) y verificar sin errores
- [ ] Deploy (`/deploy`)
- [ ] INSERT comunicado en BD
- [ ] (Opcional) Crear entry point en `src/remotion/index.tsx` para MP4 export
- [ ] (Opcional) Render MP4: `npx remotion render ...`

---

## 12. Proxima Animacion: Llamadas Outbound

Cuando se implemente la funcionalidad de llamadas outbound, crear animacion similar:

- **component_key:** `outbound-calls-intro`
- **Speech:** Dar continuidad al tono y estilo del script de "Llamadas WhatsApp"
- **Referencia:** La ultima frase del speech actual hace teaser: "Próximamente... llamadas outbound. Llama a tus prospectos directamente desde la plataforma."
- **Escenas sugeridas:** Intro → Seleccionar prospecto → Click-to-call → AI briefing → Llamada activa → Notas post-llamada → Outro
- **Reusar:** Musica de fondo (`voice-calls-intro.mp3`), ParallaxBackground, patron de escenas, dual audio system

---

## 13. Dimensiones y Configuracion

```typescript
const FPS = 30;
const COMP_W = 1060;  // ancho de la composicion
const COMP_H = 650;   // alto de la composicion
```

El overlay de comunicados usa `max-w-5xl` para interactivos, lo que da ~1024px de ancho disponible. Las dimensiones 1060x650 encajan bien con padding.

---

*Handover generado el 2026-03-11. Referencia: sesion de creacion de VoiceCallsIntroTutorial con narracion sincronizada.*
