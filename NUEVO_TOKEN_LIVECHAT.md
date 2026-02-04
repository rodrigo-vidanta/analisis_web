# 🔑 Token Actualizado - LiveChat Auth

**Fecha:** 04 Febrero 2026  
**Acción:** Generación y configuración de nuevo token

---

## ✅ Token Nuevo

```
6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd
```

---

## 📋 Configuración Aplicada

### 1. Supabase Edge Functions
✅ Secret `LIVECHAT_AUTH` actualizado con el token nuevo

### 2. Base de Datos (api_auth_tokens)
Tokens actualizados en:
- ✅ `Pausar Bot` → `pause_bot_auth`
- ✅ `Enviar Mensaje WhatsApp` → `send_message_auth`  
- ✅ `Broadcast WhatsApp` → `broadcast_auth`

### 3. Edge Function Re-deployed
✅ `send-audio-proxy` re-deployed con el secret actualizado

---

## 🔧 Configuración en N8N

**IMPORTANTE:** Actualiza la credencial `LiveChat_auth` en N8N con el nuevo token:

1. **Ir a:** https://primary-dev-d75a.up.railway.app/credentials
2. **Buscar:** `LiveChat_auth`
3. **Actualizar valor:** `6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd`
4. **Guardar**

**Webhooks que usan esta credencial:**
- `/webhook/send-audio` ✅
- `/webhook/send-message`
- `/webhook/pause_bot`
- `/webhook/broadcast`

---

## 🧪 Testing

Una vez actualizado en N8N, prueba el envío de audio:

```bash
curl -X POST \
  https://primary-dev-d75a.up.railway.app/webhook/send-audio \
  -H "Content-Type: application/json" \
  -H "livechat_auth: 6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd" \
  -d '{
    "audio_base64": "test",
    "uchat_id": "test123",
    "filename": "test.mp3"
  }'
```

**Respuesta esperada:** 200 OK (después de actualizar en N8N)

---

## ⚠️ Próximo Paso

**DEBES actualizar el token en N8N** para que el webhook lo acepte.

Sin este paso, seguirá dando error 403.

---

**Última actualización:** 04 Febrero 2026  
**Estado:** ✅ Supabase actualizado | ⏳ Pendiente: Actualizar en N8N
