# 🔧 Configuración del Webhook send-audio en N8N

**Fecha:** 04 Febrero 2026  
**Prioridad:** 🔴 ALTA - Requerido para funcionalidad de audio

---

## 🚨 Problema Actual

El webhook `/webhook/send-audio` **NO EXISTE en N8N**, por lo que estamos recibiendo error 403.

**Solución temporal implementada:** Usar `/webhook/send-img` (pero puede no procesar audios correctamente)

**Solución definitiva:** Crear el workflow en N8N

---

## 🛠️ Opción 1: Crear Webhook en N8N (Recomendado)

### Paso 1: Crear Nuevo Workflow

1. Ir a: https://primary-dev-d75a.up.railway.app
2. Click en "+" para nuevo workflow
3. Nombre: `[api]-whatsapp-audio-envio`

### Paso 2: Configurar Webhook Node

```json
{
  "path": "/webhook/send-audio",
  "method": "POST",
  "authentication": {
    "type": "headerAuth",
    "headerName": "livechat_auth",
    "headerValue": "={{$env.LIVECHAT_AUTH}}"
  }
}
```

### Paso 3: Nodos del Workflow

```
1. Webhook (Trigger)
   ↓
2. Set (Extraer datos)
   - audio_base64
   - uchat_id
   - filename
   ↓
3. HTTP Request (Enviar a UChat/WhatsApp API)
   - URL: API de UChat para enviar audio
   - Method: POST
   - Body: Audio en formato requerido
   ↓
4. Respond to Webhook
   - Status: 200
   - Body: {"success": true}
```

### Paso 4: Configurar Variables de Entorno

En N8N Settings → Variables:
- `LIVECHAT_AUTH` = (obtener de `api_auth_tokens` → `Pausar Bot`)

---

## 🔧 Opción 2: Adaptar Webhook Existente (Temporal)

### Modificar `/webhook/send-img` para soportar audio:

1. Abrir workflow: `[api]-whatsapp-send-img`
2. Agregar condición en el nodo "Set":

```javascript
// Detectar si es audio
const isAudio = $json.type === 'audio' || 
                $json.imagenes?.[0]?.filename?.endsWith('.mp3');

if (isAudio) {
  // Procesar como audio
  return {
    type: 'audio',
    uchat_id: $json.uchat_id,
    audio_data: $json.imagenes[0].archivo
  };
} else {
  // Procesar como imagen (lógica existente)
  return $json;
}
```

---

## 📋 Formato del Payload

### Lo que envía la Edge Function:

```json
[{
  "uchat_id": "f190385u343660219",
  "whatsapp": "f190385u343660219",
  "type": "audio",
  "imagenes": [{
    "archivo": "data:audio/mp3;base64,SGVsbG8gd29ybGQ=...",
    "destino": "whatsapp",
    "filename": "audio_1738704123456.mp3"
  }]
}]
```

### Lo que N8N debe hacer:

1. **Extraer** `archivo` (que contiene el audio en Base64)
2. **Decodificar** el Base64 a archivo binario
3. **Subir** el audio a UChat/WhatsApp API
4. **Enviar** el mensaje de audio al `uchat_id`

---

## 🔐 Autenticación

El webhook usa el mismo token que otros webhooks de livechat:

**Header:** `livechat_auth`  
**Valor:** Obtener de la base de datos:

```sql
SELECT token_value 
FROM api_auth_tokens 
WHERE module_name = 'Pausar Bot' 
AND token_key = 'pause_bot_auth';
```

O usar el que ya está configurado en N8N para otros webhooks de livechat.

---

## 🧪 Testing del Webhook

### Test Manual con cURL:

```bash
# Obtener el token de LIVECHAT_AUTH
TOKEN="tu_token_aqui"

# Test del webhook
curl -X POST \
  https://primary-dev-d75a.up.railway.app/webhook/send-audio \
  -H "Content-Type: application/json" \
  -H "livechat_auth: $TOKEN" \
  -d '[{
    "uchat_id": "test123",
    "whatsapp": "test123",
    "type": "audio",
    "imagenes": [{
      "archivo": "data:audio/mp3;base64,SGVsbG8=",
      "destino": "whatsapp",
      "filename": "test.mp3"
    }]
  }]'
```

**Respuestas esperadas:**
- ✅ 200: Webhook procesó correctamente
- ❌ 403: Token inválido
- ❌ 404: Webhook no existe (necesita crearse)

---

## ⚠️ Nota Importante

**Mientras no exista el webhook:**
- La funcionalidad de audio NO funcionará
- El frontend mostrará error 403
- Los usuarios no podrán enviar mensajes de voz

**Prioridad:** Crear este webhook lo antes posible

---

## 📝 Alternativa Rápida

Si no puedes crear el webhook ahora, puedes:

1. **Desactivar el botón de audio** temporalmente en el frontend
2. O **mostrar mensaje:** "Función en mantenimiento"

Para desactivar, editar `LiveChatCanvas.tsx`:

```typescript
// Línea ~8900 - Agregar disabled
<button
  onClick={startRecording}
  disabled={true} // <-- AGREGAR ESTO
  className="px-4 py-3 bg-gradient-to-r from-purple-500..."
>
```

---

**Última actualización:** 04 Febrero 2026  
**Próximo paso:** Crear webhook en N8N o adaptar el existente
