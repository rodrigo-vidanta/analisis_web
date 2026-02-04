# ✅ CORRECCIÓN APLICADA - send-audio-proxy

**Fecha:** 04 Febrero 2026  
**Acción:** Corrección del webhook y formato de payload

---

## 🔧 Cambios Realizados

### 1. Webhook Correcto
- ❌ **Antes:** `/webhook/send-img` (incorrecto)
- ✅ **Ahora:** `/webhook/send-audio` (correcto)

### 2. Formato de Payload
- ❌ **Antes:** Formato de array con imagenes (incompatible)
- ✅ **Ahora:** Formato simple para audio

```json
{
  "audio_base64": "SGVsbG8gd29ybGQ=...",
  "uchat_id": "f190385u343660219",
  "filename": "audio_1738704123456.mp3",
  "id_sender": "uuid-del-usuario"
}
```

### 3. Autenticación
- ✅ Header: `livechat_auth`
- ✅ Token: `2025_livechat_auth` (mismo que send-message, pause-bot, broadcast)
- ✅ Secret en Supabase: `LIVECHAT_AUTH`

---

## 📋 Verificación del Secret

Para verificar que el secret esté configurado correctamente en Supabase:

1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/edge-functions
2. Buscar: `LIVECHAT_AUTH`
3. Valor debe ser: `2025_livechat_auth`

Si no está configurado, agregarlo:

```bash
# Opción 1: Dashboard UI (recomendado)
1. Settings → Edge Functions → Secrets
2. Add secret: LIVECHAT_AUTH = 2025_livechat_auth

# Opción 2: CLI
npx supabase secrets set LIVECHAT_AUTH="2025_livechat_auth" --project-ref glsmifhkoaifvaegsozd
```

---

## 🧪 Testing

### Verificar que el webhook responde:

```bash
curl -X POST \
  https://primary-dev-d75a.up.railway.app/webhook/send-audio \
  -H "Content-Type: application/json" \
  -H "livechat_auth: 2025_livechat_auth" \
  -d '{
    "audio_base64": "SGVsbG8=",
    "uchat_id": "test123",
    "filename": "test.mp3"
  }'
```

**Respuestas esperadas:**
- ✅ 200: Webhook funcionando
- ❌ 403: Token incorrecto o webhook requiere otro token
- ❌ 404: Webhook no existe (verificar en N8N)

---

## 🔍 Si Sigue Dando Error 403

### Causas Posibles:

1. **Secret no configurado en Supabase:**
   - Verificar que `LIVECHAT_AUTH` = `2025_livechat_auth`
   - Reiniciar edge function después de agregar secret

2. **Webhook espera otro token:**
   - Verificar en N8N qué header auth usa el webhook `/webhook/send-audio`
   - Comparar con `/webhook/send-message` (deberían usar el mismo)

3. **Webhook no existe:**
   - Verificar en N8N que existe el workflow con path `/webhook/send-audio`
   - Si no existe, crearlo siguiendo patrón de send-message

---

## 📝 Próximos Pasos

1. **Verificar secret en Supabase** (Dashboard)
2. **Probar envío de audio** desde el frontend
3. **Si falla:**
   - Revisar logs en Dashboard → Edge Functions → send-audio-proxy
   - Verificar workflow en N8N: https://primary-dev-d75a.up.railway.app

---

**Estado:** ✅ Función re-deployed con configuración correcta  
**Última actualización:** 04 Febrero 2026
