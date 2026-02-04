# ✅ TOKENS CORREGIDOS - Separación de Auth

**Fecha:** 04 Febrero 2026  
**Acción:** Revertir cambios y crear token independiente

---

## ✅ Corrección Aplicada

### Secrets en Supabase:

| Secret | Valor | Uso |
|--------|-------|-----|
| `LIVECHAT_AUTH` | `2025_livechat_auth` | ✅ REVERTIDO - Todos los webhooks originales |
| `SEND_AUDIO_AUTH` | `6ff68...ccbd` | ✅ NUEVO - Solo para send-audio |

### Base de Datos Actualizada:

| Módulo | Token Key | Valor |
|--------|-----------|-------|
| Pausar Bot | `pause_bot_auth` | ✅ `2025_livechat_auth` |
| Enviar Mensaje WhatsApp | `send_message_auth` | ✅ `2025_livechat_auth` |
| Broadcast WhatsApp | `broadcast_auth` | ✅ `2025_livechat_auth` |
| **Enviar Audio WhatsApp** | `send_audio_auth` | ✅ `6ff68...ccbd` (nuevo) |

---

## 📋 Configuración en N8N

**Solo necesitas actualizar UNA credencial:**

### Webhook send-audio:
- **Header Name:** `Authorization`
- **Header Value:** `6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd`

**Los demás webhooks NO los toques** - siguen usando sus credenciales originales.

---

## ✅ Estado Final

- ✅ Webhooks originales funcionando (send-message, pause-bot, paraphrase, etc.)
- ✅ Webhook send-audio con token independiente
- ✅ Edge function actualizada y deployed
- ✅ Base de datos sincronizada

---

## 🧪 Verificación

Prueba estas funciones (deberían funcionar):
- ✅ Enviar mensaje texto
- ✅ Pausar bot
- ✅ Parafrasear con IA
- ✅ Enviar imagen
- ⏳ Enviar audio (después de actualizar credencial en N8N)

---

**Estado:** ✅ CORREGIDO  
**Próximo paso:** Actualizar solo la credencial de send-audio en N8N
