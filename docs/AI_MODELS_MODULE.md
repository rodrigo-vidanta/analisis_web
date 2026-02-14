# AI Models Module - Modelos de IA y Generacion de Audio

**Fecha:** 2026-02-13 | **Version:** 1.0.0

---

## Resumen

Modulo de gestion de modelos IA para generacion de voz (ElevenLabs), efectos de sonido, speech-to-text y repositorio de imagenes. Accesible para roles admin, productor y developer. Incluye sistema de cuotas de tokens por usuario.

---

## Arquitectura

```
AIModelsManager (tabs)
  |-- VoiceModelsSection (3,129 lineas)
  |     |-- Voice Library (busqueda, filtros, preview)
  |     |-- Text-to-Speech (5 modelos, 27 tags v3)
  |     |-- Speech-to-Speech (mic/upload + conversion)
  |     |-- Speech-to-Text (Whisper/Scribe)
  |     |-- Sound Effects (duracion, prompt)
  |
  |-- ImageRepositorySection (115 lineas, skeleton)
  |-- ImageGenerationSection (134 lineas, skeleton)

Servicios:
  elevenLabsService -> ElevenLabs API
  aiModelsDbService -> Supabase (ai_audio_generations, ai_user_preferences)
  tokenService -> Cuotas (ai_token_limits, ai_token_usage, ai_user_permissions)
  translationService -> MyMemory API (traduccion auto)
```

---

## Ruta y Permisos

**Ruta:** `case 'ai-models'` en MainApp.tsx (linea 435)
**Sidebar:** "Modelos LLM" (linea 636 en Sidebar.tsx)
**Roles permitidos:** admin, productor, developer

---

## Componentes

### AIModelsManager (`src/components/ai-models/AIModelsManager.tsx`, 161 lineas)

Orquestador con 3 tabs:
1. **Voice Models** (purple/pink gradient) - Completamente implementado
2. **Image Repository** (blue/cyan gradient) - Skeleton UI
3. **Image Generation** (emerald/teal gradient) - Skeleton UI

### VoiceModelsSection (`src/components/ai-models/VoiceModelsSection.tsx`, 3,129 lineas)

Componente principal con 5 sub-tabs:

#### Voice Library
- 5 filtros: category, gender, language, accent, age
- Busqueda en tiempo real por metadatos
- Preview de voz con texto de ejemplo
- Cards con gradientes por categoria (premade, cloned, generated, professional)

#### Text-to-Speech
- **Modelos soportados:** `eleven_multilingual_v2`, `eleven_v3`, `eleven_turbo_v2_5`
- Controles avanzados: stability, similarity_boost, style, speaker_boost
- Capacidades dinamicas por modelo (v3 no soporta speaker_boost ni speech_rate)
- **27 tags ElevenLabs v3:** `[whisper]`, `[shouting]`, `[excited]`, etc.
- Seed para reproducibilidad
- Seleccion de formato de salida
- Control de velocidad de habla
- Estimacion de caracteres
- Auto-traduccion

#### Speech-to-Speech
- Grabacion via microfono o upload de archivo
- Drag & drop
- Conversion de voz usando voz seleccionada

#### Speech-to-Text
- Modelo Whisper/Scribe v1
- Formatos de salida: text, JSON, SRT, VTT
- Soporte de timestamps
- Deteccion de speakers
- Filtrado de ruido

#### Sound Effects
- Duracion 1-60 segundos
- Slider de influencia del prompt
- Auto-traduccion a ingles para mejores resultados

**Estado:** 34+ variables de estado local + localStorage + BD sync

### ImageRepositorySection (115 lineas) - NO IMPLEMENTADO

Skeleton UI con lista de features planeadas:
- Busqueda por resort, amenity, mood
- Filtros multi-dimensionales
- Busqueda semantica con embeddings
- Integracion S3

### ImageGenerationSection (134 lineas) - NO IMPLEMENTADO

Skeleton UI con lista de features planeadas:
- Integracion Nano Banana
- Composicion inteligente de prompts
- Historial visual

---

## Servicios

### elevenLabsService (`src/services/elevenLabsService.ts`, 816 lineas)

Integracion completa con ElevenLabs API.

**Gestion de API Key:**
- Carga desde BD via `credentialsService` (module: 'ElevenLabs', key: 'API_KEY')
- Fallback a `VITE_ELEVENLABS_API_KEY` env var
- Validacion contra valores placeholder
- Lazy loading en primera llamada

**Metodos principales:**

| Metodo | Descripcion |
|--------|-------------|
| `getVoices()` | Listar voces disponibles |
| `textToSpeech(voiceId, text, settings, model)` | Generacion TTS |
| `speechToSpeech(voiceId, audioFile, settings)` | Conversion de voz |
| `speechToText(audioFile, options)` | Transcripcion (Scribe v1) |
| `generateSoundEffect(text, duration)` | Efectos de sonido |
| `getModels()` | Modelos disponibles |
| `getUserInfo()` | Info de cuenta |
| `getUsage()` | Limites de suscripcion |
| `uploadAudioToStorage(blob, filename)` | Subir a bucket `ai_manager` |
| `downloadAudio(url, filename)` | Descargar archivo de audio |

**Ajustes por modelo:**
- v3: No speaker_boost, no speech_rate, valores discretos de stability
- Turbo: Stability discreta, formatos limitados
- Tags solo en v3

### aiModelsDbService (`src/services/aiModelsDbService.ts`, 289 lineas)

Operaciones CRUD para generaciones de audio.

| Metodo | Descripcion |
|--------|-------------|
| `saveAudioGeneration(data)` | INSERT en ai_audio_generations |
| `getUserAudioHistory(userId, type?, limit?)` | Historial (max 100) |
| `deleteAudioGeneration(id)` | DELETE por ID |
| `updateAudioUrl(id, url)` | Actualizar URL S3 |
| `saveUserPreferences(userId, prefs)` | UPSERT en ai_user_preferences |
| `getUserPreferences(userId)` | Obtener preferencias |

### tokenService (`src/services/tokenService.ts`, 644 lineas)

Sistema de cuotas de tokens por usuario.

| Metodo | Descripcion |
|--------|-------------|
| `getUserTokenInfo(userId)` | Limites + uso (admin = unlimited) |
| `getUserAIPermissions(userId)` | Permisos granulares por feature |
| `canUserPerformOperation(userId, type, chars)` | Pre-flight check |
| `recordTokenUsage(userId, data)` | Registrar consumo |
| `updateTokenLimits(userId, limits)` | Admin: cambiar limites |
| `updateUserAIPermissions(userId, perms)` | Admin: cambiar permisos |
| `getUsageColor(percentage)` | Color UI (red >90%, orange >80%, etc.) |

**Colores de uso:**
- `< 60%`: green
- `60-80%`: yellow
- `80-90%`: orange
- `> 90%`: red

### translationService (`src/services/translationService.ts`, 268 lineas)

Traduccion gratuita via MyMemory API (sin autenticacion).

| Metodo | Descripcion |
|--------|-------------|
| `translateText(text, source, target)` | Traduccion generica |
| `detectLanguage(text)` | Deteccion heuristica |
| `translateForSoundEffects(text)` | Auto-traducir a ingles |
| `getSupportedLanguages()` | 10 idiomas soportados |

---

## Base de Datos

### ai_audio_generations

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID PK | Identificador |
| user_id | UUID FK | Usuario |
| generation_type | VARCHAR | `text_to_speech`, `speech_to_speech`, `sound_effect` |
| original_text | TEXT | Texto original |
| translated_text | TEXT | Texto traducido (si aplica) |
| voice_id | VARCHAR | ID de voz ElevenLabs |
| voice_name | VARCHAR | Nombre de voz |
| model_id | VARCHAR | Modelo usado |
| voice_settings | JSONB | Configuracion de voz |
| audio_file_url | VARCHAR | URL S3 del audio generado |
| character_count | INTEGER | Caracteres procesados |
| status | VARCHAR | `pending`, `processing`, `completed`, `failed` |

**RLS:** Usuario ve/edita solo propias. Admin ve todas.
**Trigger:** Auto-cleanup del historial mas antiguo segun `max_audio_history`.

### ai_user_preferences

| Campo | Tipo | Default |
|-------|------|---------|
| favorite_voices | JSONB | [] |
| recent_voices | JSONB | [] |
| default_voice_settings | JSONB | {...} |
| preferred_model | VARCHAR | `eleven_multilingual_v2` |
| auto_translate_enabled | BOOLEAN | true |
| source_language | VARCHAR | `es` |
| target_language | VARCHAR | `en` |

### ai_token_limits

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| user_id | UUID PK | Usuario |
| monthly_limit | INTEGER | Limite mensual (-1 = unlimited/admin) |
| daily_limit | INTEGER | Limite diario |
| current_month_usage | INTEGER | Uso mes actual |
| current_day_usage | INTEGER | Uso dia actual |
| warning_threshold | NUMERIC | Umbral de alerta (default 0.8) |

### ai_token_usage

Log de auditoria de consumo de tokens (operation_type, tokens_used, voice, model, etc.)

### ai_user_permissions

Permisos granulares por feature:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| can_use_tts | BOOLEAN | Text-to-Speech |
| can_use_advanced_tts | BOOLEAN | TTS avanzado |
| can_use_sound_effects | BOOLEAN | Efectos de sonido |
| can_create_voices | BOOLEAN | Clonar voces |
| can_use_dubbing | BOOLEAN | Doblaje |
| can_use_music_generation | BOOLEAN | Generar musica |
| can_use_audio_isolation | BOOLEAN | Aislar audio |
| max_audio_length_seconds | INTEGER | Duracion maxima |
| max_file_size_mb | INTEGER | Tamano maximo archivo |
| allowed_models | JSONB | Array de modelos permitidos |

### Storage Bucket: `ai_manager`

- **Publico:** Si (para reproduccion de audio)
- **Tamano maximo:** 50MB
- **MIME types:** audio/mpeg, audio/wav, audio/mp3, audio/ogg, audio/webm
- **Upload:** Solo service_role
- **Read:** Publico

---

## Flujo de Generacion

```
1. Input de usuario (texto, voz, modelo)
2. tokenService.canUserPerformOperation() -> verificar cuota
3. translationService.translateForSoundEffects() -> traducir si necesario
4. elevenLabsService.textToSpeech() -> generar audio
5. aiModelsDbService.saveAudioGeneration() -> guardar registro
6. elevenLabsService.uploadAudioToStorage() -> subir a S3
7. aiModelsDbService.updateAudioUrl() -> actualizar URL
8. tokenService.consumeTokens() -> registrar consumo
9. Recargar historial
```

---

## Edge Function Relacionada

### anthropic-proxy

Proxy para Claude API (usado por modulo editor/analisis, no directamente por ai-models).
- Secret: `ANTHROPIC_API_KEY`
- Detecta problemas de billing (401/402)

---

## Estado de Implementacion

| Feature | Estado |
|---------|--------|
| Voice Library | Completo |
| Text-to-Speech | Completo |
| Speech-to-Speech | Completo |
| Speech-to-Text | Completo |
| Sound Effects | Completo |
| Token Management | Completo |
| Image Repository | Skeleton UI |
| Image Generation | Skeleton UI |
| Voice Cloning UI | No implementado (API lista) |

---

## Inventario de Archivos

| Archivo | Lineas | Proposito |
|---------|--------|-----------|
| `src/components/ai-models/AIModelsManager.tsx` | 161 | Tab navigation |
| `src/components/ai-models/VoiceModelsSection.tsx` | 3,129 | TTS/STS/STT completo |
| `src/components/ai-models/ImageRepositorySection.tsx` | 115 | Skeleton |
| `src/components/ai-models/ImageGenerationSection.tsx` | 134 | Skeleton |
| `src/services/elevenLabsService.ts` | 816 | API ElevenLabs |
| `src/services/aiModelsDbService.ts` | 289 | DB operations |
| `src/services/tokenService.ts` | 644 | Cuotas tokens |
| `src/services/translationService.ts` | 268 | Traduccion |
| **Total** | **5,556** | |
