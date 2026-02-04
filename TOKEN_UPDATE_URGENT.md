# 🚨 ACTUALIZACIÓN DE TOKEN - TODOS LOS WEBHOOKS

**Fecha:** 04 Febrero 2026  
**Acción Urgente:** Actualizar credenciales en N8N

---

## ⚠️ Problema

Al actualizar el token para `send-audio`, cambié el secret `LIVECHAT_AUTH` que usan **10 webhooks diferentes**.

Ahora todos están fallando con error 403.

---

## 🔑 Nuevo Token (Actualizar en N8N)

```
6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd
```

---

## 📋 Webhooks que Debes Actualizar

Actualiza la credencial `LiveChat_auth` (o similar) en estos workflows:

| # | Webhook | Path | Uso |
|---|---------|------|-----|
| 1 | **send-audio** | `/webhook/send-audio` | Envío de audio ✅ Ya actualizado |
| 2 | **send-message** | `/webhook/send-message` | Envío de mensajes texto |
| 3 | **pause-bot** | `/webhook/pause_bot` | Pausar/reanudar bot |
| 4 | **paraphrase** | `/webhook/paraphrase` | Parafraseo con IA |
| 5 | **send-img** | `/webhook/send-img` | Envío de imágenes |
| 6 | **broadcast** | `/webhook/broadcast` | Envío masivo |
| 7 | **transfer-request** | `/webhook/transfer` | Transferencias |
| 8 | **import-contact** | `/webhook/import-contact` | Importar contactos |
| 9 | **tools** | `/webhook/tools` | Tools de Vapi |

---

## ✅ Cómo Actualizar en N8N

### Opción 1: Actualizar Credencial Global (Recomendado)

1. **Ir a:** https://primary-dev-d75a.up.railway.app/credentials
2. **Buscar:** `LiveChat_auth` (o como la hayas nombrado)
3. **Editar:**
   - Name: `Authorization` (o el que uses)
   - Value: `6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd`
4. **Guardar**

✅ **Esto actualizará TODOS los webhooks que usen esa credencial automáticamente.**

### Opción 2: Actualizar Cada Workflow

Si usas credenciales diferentes en cada webhook (no recomendado):

1. Abrir cada workflow de la lista
2. Ir al nodo Webhook
3. Editar credencial
4. Actualizar valor del token
5. Guardar workflow

---

## 🔄 Alternativa: Revertir el Token

Si prefieres no actualizar 9 webhooks, puedo:

1. **Revertir** el secret `LIVECHAT_AUTH` al valor anterior
2. **Crear** un secret nuevo `SEND_AUDIO_AUTH` solo para audio
3. **Modificar** solo la edge function de audio

¿Prefieres esta opción?

---

## 🧪 Verificar Después de Actualizar

Prueba estas funciones en el frontend:
- ✅ Enviar mensaje de texto
- ✅ Pausar bot
- ✅ Parafrasear con IA
- ✅ Enviar imagen
- ✅ Enviar audio

---

## 📝 Para Evitar Esto en el Futuro

**Recomendación:** Usar **una sola credencial global** en N8N para todos los webhooks de livechat.

De esta forma, al cambiar el token solo necesitas actualizar la credencial en un lugar.

---

**Estado Actual:**  
❌ **9 webhooks fallando con 403**  
⏳ **Pendiente:** Actualizar credencial en N8N

¿Prefieres actualizar la credencial en N8N o que revierta el token?
