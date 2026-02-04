# 🔧 N8N: Procesar Audio WebM y Enviar a WhatsApp

**Fecha:** 04 Febrero 2026  
**Problema:** Audio WebM no se reproduce (codec no compatible)

---

## 🎯 Solución: Workflow Completo

### Nodo 1: Webhook ✅
Ya configurado correctamente.

---

### Nodo 2: Code - Decodificar y Preparar

**Tipo:** Code (Run Once for All Items)

```javascript
// 1. Obtener datos del webhook
const audioBase64 = $input.item.json.body.audio_base64;
const uchatId = $input.item.json.body.uchat_id;
const filename = $input.item.json.body.filename || 'audio.mp3';
const idSender = $input.item.json.body.id_sender;

// 2. Decodificar Base64 a Buffer
const audioBuffer = Buffer.from(audioBase64, 'base64');

console.log('Audio recibido:', {
  size: audioBuffer.length,
  uchat_id: uchatId,
  filename: filename
});

// 3. Crear objeto binario para N8N
return {
  json: {
    uchat_id: uchatId,
    filename: filename,
    audio_size: audioBuffer.length,
    id_sender: idSender,
    mime_type: 'audio/webm' // Formato original
  },
  binary: {
    audio: {
      data: audioBuffer,
      mimeType: 'audio/webm',
      fileName: filename.replace('.mp3', '.webm') // Cambiar extensión
    }
  }
};
```

---

### Nodo 3A: Opción 1 - Enviar WebM Directamente

**Si UChat acepta WebM/Opus:**

**HTTP Request:**
- **Method:** POST
- **URL:** Tu endpoint de UChat para enviar audio
- **Authentication:** API Key de UChat
- **Body Type:** Multipart Form Data
- **Form Fields:**
  - `to`: `{{$json.uchat_id}}`
  - `type`: `audio`
  - `audio`: `{{$binary.audio}}` (seleccionar desde Binary Data)

---

### Nodo 3B: Opción 2 - Convertir a MP3/OGG (Recomendado)

**Si UChat necesita MP3/OGG:**

#### Opción 2.1: Usando Servicio de Conversión

**HTTP Request a Servicio de Conversión:**
- **Method:** POST
- **URL:** `https://api.cloudconvert.com/v2/convert` (o similar)
- **Body:**
  ```json
  {
    "input_format": "webm",
    "output_format": "mp3",
    "file": "{{$binary.audio.data}}",
    "bitrate": 128
  }
  ```

#### Opción 2.2: Usando Execute Command (si tienes FFmpeg)

**Execute Command Node:**
```bash
# Guardar el audio en archivo temporal
echo "$binary.audio.data" | base64 -d > /tmp/audio.webm

# Convertir con FFmpeg
ffmpeg -i /tmp/audio.webm -codec:a libmp3lame -b:a 128k /tmp/audio.mp3

# Leer el resultado
cat /tmp/audio.mp3 | base64

# Limpiar
rm /tmp/audio.webm /tmp/audio.mp3
```

#### Opción 2.3: URL Pública Temporal

1. **Subir a Storage (S3/Supabase/Cloudflare R2)**
2. **Obtener URL pública**
3. **Enviar URL a UChat** (en lugar del binario)

---

### Nodo 4: Enviar a UChat API

**Ejemplo con API de UChat:**

**HTTP Request:**
- **Method:** POST
- **URL:** `https://api.uchat.com.au/v1/bots/YOUR_BOT_ID/messages`
- **Authentication:** API Key
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_UCHAT_API_KEY"
  }
  ```
- **Body (JSON):**
  ```json
  {
    "to": "{{$json.uchat_id}}",
    "type": "audio",
    "audio": {
      "url": "URL_DEL_AUDIO_CONVERTIDO_O_SUBIDO"
    }
  }
  ```

---

### Nodo 5: Respond to Webhook

**Respond to Webhook:**
- **Response Code:** 200
- **Response Body:**
  ```json
  {
    "success": true,
    "message": "Audio procesado correctamente",
    "uchat_id": "={{$node['Code'].json.uchat_id}}",
    "audio_size": "={{$node['Code'].json.audio_size}}"
  }
  ```

---

## 🎬 Flujo Recomendado (Más Simple)

Si quieres algo que funcione inmediatamente:

### 1. Subir a Supabase Storage

**HTTP Request a Supabase:**
```javascript
// En Code Node
const audioBuffer = Buffer.from(audioBase64, 'base64');
const fileName = `audios/${Date.now()}_${filename}`;

// Subir a Supabase Storage via API
const supabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const storageBucket = 'whatsapp-media';
const uploadUrl = `${supabaseUrl}/storage/v1/object/${storageBucket}/${fileName}`;

const uploadResponse = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SERVICE_ROLE_KEY',
    'Content-Type': 'audio/webm'
  },
  body: audioBuffer
});

// Obtener URL pública
const publicUrl = `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${fileName}`;

return {
  json: {
    uchat_id: uchatId,
    audio_url: publicUrl
  }
};
```

### 2. Enviar URL a UChat

Luego enviar solo la URL del audio (mucho más simple).

---

## 🧪 Test Rápido

Para verificar que el audio es válido:

1. **En N8N, agregar nodo "Download":**
   - Input: `{{$binary.audio}}`
   - Download to: `/tmp/test_audio.webm`

2. **Reproducir localmente:**
   ```bash
   ffmpeg -i /tmp/test_audio.webm
   ```

Si FFmpeg da error, el audio está corrupto desde el navegador.

---

## 💡 Recomendación

**La forma más simple:** Subir el audio a Supabase Storage y enviar la URL a UChat, en lugar de enviar el binario directamente.

¿Quieres que implemente esa opción?

---

**Última actualización:** 04 Febrero 2026
