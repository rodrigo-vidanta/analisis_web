# Deploy de send-audio-proxy Edge Function

## ✅ Pre-requisitos

1. Tener instalado Supabase CLI
2. Estar autenticado con `supabase login`
3. Tener acceso al proyecto `glsmifhkoaifvaegsozd`

---

## 📦 Deploy Steps

### 1. Verificar Secrets

```bash
# Listar secrets actuales
supabase secrets list --project-ref glsmifhkoaifvaegsozd

# Verificar que existen estos secrets:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY  
# - LIVECHAT_AUTH
```

Si falta `LIVECHAT_AUTH`, configurarlo:

```bash
# Obtener el token de SystemUI → system_credentials → module: "Llamadas Programadas"
supabase secrets set LIVECHAT_AUTH="<token_aqui>" --project-ref glsmifhkoaifvaegsozd
```

### 2. Deploy de la Función

```bash
# Desde la raíz del proyecto
cd supabase/functions/send-audio-proxy

# Deploy
supabase functions deploy send-audio-proxy --project-ref glsmifhkoaifvaegsozd
```

### 3. Verificar Deploy

```bash
# Ver logs en tiempo real
supabase functions logs send-audio-proxy --project-ref glsmifhkoaifvaegsozd
```

### 4. Test de la Función

```bash
# Obtener JWT de usuario desde Supabase Dashboard
# Dashboard → Authentication → Users → Copy JWT

JWT="<tu_jwt_aqui>"

# Test
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

**Respuestas esperadas:**

- **200:** `{ "success": true, ... }`
- **400:** `{ "error": "audio_base64 and uchat_id are required", "success": false }`
- **401:** `{ "error": "Authentication required", "success": false }`
- **500:** `{ "error": "...", "success": false }`

---

## 🔧 Webhook de N8N

La función llama al siguiente webhook:

```
POST https://primary-dev-d75a.up.railway.app/webhook/send-audio
```

**Headers:**
- `Content-Type: application/json`
- `livechat_auth: <token_de_LIVECHAT_AUTH>`

**Payload:**
```json
{
  "audio_base64": "...",
  "uchat_id": "...",
  "filename": "audio.mp3",
  "id_sender": "uuid-del-usuario"
}
```

---

## ⚠️ Troubleshooting

### Error: "LIVECHAT_AUTH no configurado"

```bash
# Configurar el secret
supabase secrets set LIVECHAT_AUTH="<token>" --project-ref glsmifhkoaifvaegsozd
```

### Error: "Authentication required"

- Verificar que el JWT no haya expirado
- Verificar que el JWT sea de un usuario activo
- Regenerar JWT desde Supabase Dashboard

### Error: "Webhook Error: 500"

- Verificar que el webhook de N8N esté activo
- Verificar logs en N8N: https://primary-dev-d75a.up.railway.app
- Verificar que `LIVECHAT_AUTH` sea correcto

### Ver Logs

```bash
# Logs en tiempo real
supabase functions logs send-audio-proxy --project-ref glsmifhkoaifvaegsozd --tail

# Logs con filtro
supabase functions logs send-audio-proxy --project-ref glsmifhkoaifvaegsozd | grep ERROR
```

---

## 📝 Notas

- La función usa el mismo token `LIVECHAT_AUTH` que `send-message-proxy`
- El audio se envía en Base64 (tamaño máximo recomendado: 5MB)
- El formato de audio es `audio/webm` (grabado en el navegador)
- N8N debe procesar el audio y enviarlo a WhatsApp

---

**Última actualización:** 04 de Febrero 2026
