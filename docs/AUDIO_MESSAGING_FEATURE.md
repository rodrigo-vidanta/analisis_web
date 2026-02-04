# Funcionalidad de Envío de Audio en WhatsApp

**Fecha:** 04 de Febrero 2026  
**Versión:** v1.0.0

---

## 📋 Resumen

Se ha implementado la funcionalidad de envío de mensajes de voz (audio) en el módulo de WhatsApp (LiveChatCanvas), permitiendo a los usuarios grabar y enviar audios directamente desde el chat.

---

## ✨ Características Implementadas

### 1. Botones de Audio

#### **Orden de Botones (Izquierda a Derecha):**
1. Adjuntar imagen (Paperclip)
2. Llamada (Phone)
3. Textarea de mensaje
4. Botón Enviar mensaje (Send) - azul
5. Botón Grabar audio (Mic) - morado

#### **Estados del Botón de Audio:**

**Estado Inactivo:**
- Botón morado con ícono de micrófono
- Ubicación: A la derecha del botón de enviar
- Click: Inicia grabación

**Estado Grabando:**
- El botón de micrófono desaparece
- Aparecen 2 nuevos botones:
  1. **Detener y Enviar** (verde con ícono de cuadrado)
  2. **Cancelar** (rojo con ícono de basura)
- Indicador visual sobre el textarea:
  - Fondo rojo translúcido
  - Punto rojo pulsante
  - Contador de tiempo (MM:SS)
- Textarea deshabilitado durante la grabación

**Estado Enviando:**
- Botón muestra spinner de carga

### 2. Funciones de Grabación

#### `startRecording()`
- Solicita permiso de micrófono al usuario
- Inicia `MediaRecorder` con formato `audio/webm`
- Inicia contador de tiempo
- Reproduce sonido de inicio (800Hz)
- Deshabilita el textarea
- Maneja errores con toast notification

#### `stopRecording()`
- Detiene la grabación
- Detiene el contador de tiempo
- Reproduce sonido de fin (600Hz)
- Inicia automáticamente el envío del audio
- Re-habilita el textarea

#### `cancelRecording()`
- Detiene la grabación sin enviar
- Limpia los chunks de audio grabados
- Detiene el stream del micrófono
- Reproduce sonido de cancelación (400Hz - tono más grave)
- Re-habilita el textarea
- Muestra toast de confirmación
- Resetea el contador de tiempo

#### `sendAudioMessage(audioBlob: Blob)`
- Convierte el blob de audio a Base64
- Obtiene el `uchat_id` de la conversación
- Pausa el bot antes de enviar
- Llama a la Edge Function `send-audio-proxy`
- Maneja respuestas:
  - **200:** Éxito - muestra toast de confirmación
  - **400:** Error de solicitud - muestra mensaje de error específico
  - **500:** Error del servidor - muestra toast de error

#### `playRecordingSound(type: 'start' | 'stop')`
- Genera tonos de audio con Web Audio API
- Feedback auditivo para inicio y fin de grabación

---

## 🔧 Edge Function: send-audio-proxy

### Ubicación
```
supabase/functions/send-audio-proxy/index.ts
```

### Funcionamiento
1. **Autenticación:** Valida JWT del usuario con Supabase
2. **Validación:** Verifica que `audio_base64` y `uchat_id` estén presentes
3. **Autorización:** Obtiene token `LIVECHAT_AUTH` de secrets
4. **Envío:** POST al webhook N8N con el audio en Base64
5. **Respuesta:** Devuelve estado de éxito o error

### Payload Esperado
```typescript
{
  audio_base64: string,  // Audio en Base64
  uchat_id: string,      // ID de UChat del prospecto
  filename?: string,     // Nombre del archivo (default: audio.mp3)
  id_sender?: string     // ID del usuario que envía
}
```

### Headers Requeridos
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <JWT_TOKEN>'
}
```

### Webhook Destino
```
https://primary-dev-d75a.up.railway.app/webhook/send-audio
```

**Header de autenticación:** `livechat_auth` (mismo que `send-message`)

---

## 📦 Deploy

### 1. Deploy de Edge Function
```bash
# Desde la raíz del proyecto
cd supabase/functions/send-audio-proxy

# Deploy a producción
supabase functions deploy send-audio-proxy --project-ref glsmifhkoaifvaegsozd

# Verificar secrets configurados
supabase secrets list --project-ref glsmifhkoaifvaegsozd
```

### 2. Verificar Secrets
Asegurarse de que estén configurados:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LIVECHAT_AUTH` (token de N8N)

### 3. Test Manual
```bash
# Obtener JWT de usuario autenticado (desde console de Supabase Dashboard)
JWT="<tu_jwt_aqui>"

# Test de la función
curl -X POST \
  https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/send-audio-proxy \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "SGVsbG8gd29ybGQ=",
    "uchat_id": "f190385u343660219",
    "filename": "test_audio.mp3"
  }'
```

---

## 🎨 Diseño y Paleta de Colores

### Botones de Audio

#### Botón de Iniciar Grabación (Inactivo)
- **Color:** `bg-gradient-to-r from-purple-500 to-purple-600`
- **Hover:** `from-purple-600 to-purple-700`
- **Ícono:** Micrófono (Mic)

#### Botón de Detener y Enviar (Grabando)
- **Color:** `bg-gradient-to-r from-green-500 to-green-600`
- **Hover:** `from-green-600 to-green-700`
- **Ícono:** Cuadrado (Square)
- **Animación:** Entrada con scale desde 0 a 1

#### Botón de Cancelar (Grabando)
- **Color:** `bg-gradient-to-r from-red-500 to-red-600`
- **Hover:** `from-red-600 to-red-700`
- **Ícono:** Basura (Trash2)
- **Animación:** Entrada con scale desde 0 a 1 (delay 0.1s)

#### Indicador de Grabación (Overlay sobre textarea)
- **Fondo:** `bg-red-50 dark:bg-red-900/20`
- **Borde:** `border-2 border-red-500 dark:border-red-400`
- **Punto pulsante:** `w-3 h-3 bg-red-500 rounded-full` con animación de scale
- **Texto:** `text-red-600 dark:text-red-400`
- **Animación:** Fade in desde abajo (y: 10)

### Consistencia con el Módulo
- Altura: `44px` (igual que todos los botones)
- Border radius: `rounded-xl`
- Padding: `px-4 py-3`
- Sombra: `shadow-sm`
- Transiciones: `transition-all duration-200`
- Espaciado entre botones: `space-x-2`

---

## 🔒 Seguridad

### Autenticación
- **Edge Function:** Requiere JWT de usuario autenticado
- **Validación:** `supabase.auth.getUser(jwt)` antes de procesar
- **Secrets:** Token de N8N almacenado en secrets de Supabase

### Permisos
- El botón se deshabilita si el usuario está bloqueado por moderación
- No se puede grabar si la ventana de 24 horas de WhatsApp expiró

---

## 📝 Estados del Sistema

| Estado | Variable | Descripción |
|--------|----------|-------------|
| Grabando | `isRecording` | `true` durante la grabación |
| Enviando | `sendingAudio` | `true` mientras se envía el audio |
| Tiempo | `recordingTime` | Segundos transcurridos desde inicio |
| MediaRecorder | `mediaRecorderRef` | Referencia al MediaRecorder activo |
| Chunks | `audioChunksRef` | Fragmentos de audio grabados |
| Interval | `recordingIntervalRef` | ID del intervalo del contador |

### Flujo de Estados

```
INACTIVO
   ↓ (click en Mic)
GRABANDO (textarea deshabilitado)
   ↓ (click en Square)     ↓ (click en Trash2)
ENVIANDO                 CANCELADO
   ↓                        ↓
INACTIVO ←─────────────────┘
```

---

## ⚠️ Manejo de Errores

### Errores de Micrófono
- **Permiso denegado:** Toast con mensaje de error
- **Micrófono no disponible:** Toast con mensaje de error

### Errores de Red
- **400 (Bad Request):** Muestra error específico del servidor
- **500 (Server Error):** Toast con mensaje genérico
- **Timeout:** Toast con mensaje de error de red

### Limpieza de Recursos
- Al cambiar de conversación, se detiene la grabación automáticamente
- Los tracks del stream se liberan al detener
- El intervalo del contador se limpia en `useEffect` cleanup

---

## 🧪 Testing

### Manual

#### 1. Iniciar Grabación
- Click en botón morado de micrófono
- Verificar permiso de micrófono
- Verificar que textarea se deshabilita
- Verificar overlay rojo sobre textarea
- Verificar punto rojo pulsante
- Verificar contador de tiempo (00:00, 00:01, etc.)
- Verificar que aparecen 2 botones: verde (detener) y rojo (cancelar)

#### 2. Cancelar Grabación
- Iniciar grabación
- Click en botón rojo de basura
- Verificar que desaparece el overlay
- Verificar que textarea se re-habilita
- Verificar toast: "Grabación cancelada"
- Verificar que vuelve el botón morado de micrófono
- Verificar que NO se envía ningún audio

#### 3. Detener y Enviar Grabación
- Iniciar grabación
- Click en botón verde de cuadrado
- Verificar que desaparece el overlay
- Verificar que textarea se re-habilita
- Verificar que botón de micrófono muestra spinner
- Verificar toast de éxito: "Audio enviado correctamente"

#### 4. Cambiar Conversación Durante Grabación
- Iniciar grabación
- Cambiar de conversación en la lista
- Verificar que la grabación se detiene automáticamente
- Verificar que textarea se re-habilita
- Verificar que NO se envía audio

#### 5. Usuario Bloqueado
- Con usuario bloqueado, verificar que el botón de micrófono está deshabilitado
- Verificar opacity-50 y cursor-not-allowed

#### 6. Botón de Enviar Durante Grabación
- Iniciar grabación
- Verificar que botón de enviar mensaje está deshabilitado
- Tooltip debe decir: "Deten la grabación para enviar mensaje"

---

## 📚 Referencias

- **Componente:** `src/components/chat/LiveChatCanvas.tsx`
- **Edge Function:** `supabase/functions/send-audio-proxy/index.ts`
- **Servicio de Bot:** `src/services/botPauseService.ts`
- **Auth Token:** `src/utils/authToken.ts`

---

## 🔄 Mejoras Futuras

- [ ] Agregar preview del audio antes de enviar
- [ ] Limitar duración máxima de grabación (ej: 5 minutos con advertencia)
- [ ] Convertir audio a MP3 en el cliente (actualmente WebM)
- [ ] Mostrar waveform durante la grabación
- [ ] Agregar compresión de audio antes de enviar
- [ ] Permitir pausar y reanudar grabación
- [ ] Guardar draft de audio si se cierra accidentalmente
- [ ] Agregar control de volumen para monitoreo

---

**Última actualización:** 04 de Febrero 2026  
**Versión:** v1.1.0 (con cancelación)  
**Autor:** AI Assistant
