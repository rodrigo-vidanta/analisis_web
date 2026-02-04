# 🔧 Configuración de N8N - Workflow send-audio

**Fecha:** 04 Febrero 2026  
**Workflow:** Envío de Audio WhatsApp

---

## 📊 Estructura del Workflow

```
1. Webhook (Trigger) ✅
   ↓
2. Code Node (Decodificar Base64)
   ↓
3. HTTP Request (Enviar a UChat/WhatsApp API)
   ↓
4. Respond to Webhook
```

---

## 🔧 Nodo 1: Webhook (Ya Configurado)

✅ **Ya está listo**
- Path: `/webhook/send-audio`
- Method: POST
- Authentication: Header Auth → `LiveChat_auth`

**Payload recibido:**
```json
{
  "audio_base64": "GkXfo59ChoEBQv...",
  "uchat_id": "f190385u564020735",
  "filename": "audio_1770243325833.mp3",
  "id_sender": "e8ced62c-3fd0-4328-b61a-a59ebea2e877"
}
```

---

## 🔧 Nodo 2: Code Node - Decodificar Base64

**Agregar nodo:** Code → Run Once for All Items

**Código JavaScript:**

```javascript
// Obtener datos del webhook
const audioBase64 = $input.item.json.body.audio_base64;
const uchatId = $input.item.json.body.uchat_id;
const filename = $input.item.json.body.filename || 'audio.mp3';
const idSender = $input.item.json.body.id_sender;

// Decodificar Base64 a Buffer (binario)
const audioBuffer = Buffer.from(audioBase64, 'base64');

// Convertir a formato que N8N puede enviar
const audioBinary = {
  data: audioBuffer.toString('base64'), // Mantener en base64 para HTTP
  mimeType: 'audio/webm',
  fileName: filename
};

// Preparar output
return {
  json: {
    uchat_id: uchatId,
    filename: filename,
    audio_size: audioBuffer.length,
    id_sender: idSender
  },
  binary: {
    audio: audioBinary
  }
};
```

**Resultado:** El audio estará en `$binary.audio` listo para enviar

---

## 🔧 Nodo 3: HTTP Request - Enviar a UChat

**Agregar nodo:** HTTP Request

### Opción A: UChat API Directa

**Configuración:**
- **Method:** POST
- **URL:** `https://api.uchat.com.au/v1/conversations/{{$json.uchat_id}}/messages`
- **Authentication:** None (UChat usa API Key en body/headers)
- **Headers:**
  ```json
  {
    "Content-Type": "multipart/form-data"
  }
  ```
- **Body:**
  - Type: `Form-Data (Multipart)`
  - Fields:
    - `audio`: `{{$binary.audio}}`
    - `type`: `audio`

### Opción B: Usar otro Webhook de N8N (más fácil)

Si ya tienes un webhook que envía media a UChat:

**Configuración:**
- **Method:** POST
- **URL:** `https://primary-dev-d75a.up.railway.app/webhook/send-media-to-uchat`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "tu_token_interno"
  }
  ```
- **Body (JSON):**
  ```json
  {
    "uchat_id": "{{$json.uchat_id}}",
    "media_type": "audio",
    "media_base64": "{{$binary.audio.data}}",
    "filename": "{{$json.filename}}"
  }
  ```

---

## 🔧 Nodo 4: Respond to Webhook

**Agregar nodo:** Respond to Webhook

**Configuración:**
- **Respond With:** JSON
- **Response Body:**
  ```json
  {
    "success": true,
    "message": "Audio enviado correctamente",
    "uchat_id": "={{$node['HTTP Request'].json.uchat_id}}",
    "audio_size": "={{$node['Code'].json.audio_size}}"
  }
  ```

---

## 🎯 Configuración Completa Simplificada

Si quieres algo más simple sin HTTP Request externo:

### Code Node (Todo en Uno):

```javascript
// Obtener datos del webhook
const audioBase64 = $input.item.json.body.audio_base64;
const uchatId = $input.item.json.body.uchat_id;
const filename = $input.item.json.body.filename || 'audio.mp3';

// Decodificar Base64
const audioBuffer = Buffer.from(audioBase64, 'base64');

// Aquí harías la llamada a UChat API usando fetch
// Ejemplo:
const uchatResponse = await fetch('https://api.uchat.com.au/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TU_API_KEY_UCHAT',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: uchatId,
    type: 'audio',
    audio: {
      url: `data:audio/webm;base64,${audioBase64}`
    }
  })
});

return {
  json: {
    success: true,
    uchat_id: uchatId,
    audio_size: audioBuffer.length,
    status: uchatResponse.status
  }
};
```

---

## 📝 Notas Importantes

### Formato del Audio
- **Formato actual:** `audio/webm` (grabado por el navegador)
- **Tamaño ejemplo:** 144KB (5-10 segundos)
- **Codificación:** Base64

### Si UChat necesita MP3
Puedes usar un nodo de conversión o un servicio externo:
- **FFmpeg Node** (si N8N lo tiene)
- **Cloudinary** (convertir formato)
- **API externa** de conversión

---

## 🧪 Testing

1. **Activar el workflow** (toggle ON)
2. **Desde el frontend:**
   - Grabar audio
   - Enviar
3. **En N8N:**
   - Ver ejecución en tiempo real
   - Verificar que llegue el audio_base64
   - Verificar que se decodifique
   - Verificar respuesta

---

## ❓ ¿Qué API de WhatsApp/UChat usas?

Dime qué API usas para enviar mensajes y te doy la configuración exacta del HTTP Request node.

---

**Última actualización:** 04 Febrero 2026
